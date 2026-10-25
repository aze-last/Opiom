import { generateUUID } from "@/utils/id";

export interface TranscriptSnippet {
	start: number; // in seconds
	end: number; // in seconds
	text: string;
}

export interface ClipHighlight {
	id: string;
	title: string;
	hook: string;
	summary: string;
	startTime: number;
	endTime: number;
	duration: number;
	viralityScore: number; // 0 to 100
	tags: string[];
}

export type TargetClipDuration = "short" | "medium" | "long" | "any";

export interface GenerateClipsOptions {
	transcript: TranscriptSnippet[];
	focusPrompt?: string;
	targetDuration?: TargetClipDuration;
	config?: {
		baseUrl?: string;
		apiKey?: string;
		model?: string;
		temperature?: number;
		maxTokens?: number;
	};
}

export interface LlmConnectionTestResult {
	success: boolean;
	latencyMs: number;
	message: string;
}

/**
 * Pings LLM endpoint to verify Base URL and API Key validity.
 */
export async function testLlmConnection({
	baseUrl = "https://api.openai.com/v1",
	apiKey = "",
	model = "gpt-4o",
}: {
	baseUrl?: string;
	apiKey?: string;
	model?: string;
}): Promise<LlmConnectionTestResult> {
	const sanitizedUrl = baseUrl.replace(/\/+$/, "");
	const start = performance.now();

	try {
		// Ping models endpoint first for fast verification
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (apiKey) {
			headers.Authorization = `Bearer ${apiKey}`;
		}

		const response = await fetch(`${sanitizedUrl}/models`, {
			method: "GET",
			headers,
		});

		const latencyMs = Math.round(performance.now() - start);

		if (!response.ok) {
			// If /models isn't allowed, try a minimal completion
			const fallbackResponse = await fetch(`${sanitizedUrl}/chat/completions`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					model,
					messages: [{ role: "user", content: "hi" }],
					max_tokens: 1,
				}),
			});

			const fallbackLatency = Math.round(performance.now() - start);

			if (!fallbackResponse.ok) {
				const errBody = await fallbackResponse.text().catch(() => "");
				return {
					success: false,
					latencyMs: fallbackLatency,
					message: `Connection failed (HTTP ${fallbackResponse.status}): ${errBody.slice(0, 120)}`,
				};
			}

			return {
				success: true,
				latencyMs: fallbackLatency,
				message: `Successfully connected to ${model} (${fallbackLatency}ms)`,
			};
		}

		return {
			success: true,
			latencyMs,
			message: `Successfully connected to endpoint (${latencyMs}ms)`,
		};
	} catch (error) {
		const latencyMs = Math.round(performance.now() - start);
		return {
			success: false,
			latencyMs,
			message:
				error instanceof Error ? error.message : "Network request failed",
		};
	}
}

/**
 * Parses raw JSON string returned by LLM, stripping markdown codeblocks if present.
 */
export function extractJsonFromLlmResponse(text: string): unknown {
	let cleaned = text.trim();
	if (cleaned.startsWith("```")) {
		cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
	}
	return JSON.parse(cleaned);
}

/**
 * Heuristic fallback algorithm when API keys are not provided or offline.
 * Extracts high-density conversational peaks and hook questions.
 */
export function generateHeuristicClips({
	transcript,
	targetDuration = "medium",
}: {
	transcript: TranscriptSnippet[];
	targetDuration?: TargetClipDuration;
}): ClipHighlight[] {
	if (transcript.length === 0) return [];

	const durationTargets = {
		short: { min: 10, max: 25 },
		medium: { min: 25, max: 55 },
		long: { min: 55, max: 90 },
		any: { min: 15, max: 60 },
	};
	const target = durationTargets[targetDuration];

	const HOOK_WORDS = [
		"why",
		"how",
		"secret",
		"never",
		"always",
		"mistake",
		"truth",
		"best",
		"worst",
		"stop",
		"key",
		"crazy",
		"shocking",
		"finally",
	];

	const clips: ClipHighlight[] = [];
	let currentClipStart: number | null = null;
	let currentText = "";
	let clipIndex = 1;

	for (let i = 0; i < transcript.length; i++) {
		const seg = transcript[i];
		if (currentClipStart === null) {
			currentClipStart = seg.start;
		}

		currentText += ` ${seg.text}`;
		const currentDuration = seg.end - currentClipStart;

		if (currentDuration >= target.min) {
			// Score virality
			const textLower = currentText.toLowerCase();
			let hookCount = 0;
			for (const word of HOOK_WORDS) {
				if (textLower.includes(word)) hookCount++;
			}

			const viralityScore = Math.min(
				99,
				Math.max(65, 75 + hookCount * 6 + Math.round(Math.random() * 8)),
			);

			const firstSentence =
				currentText.trim().split(/[.!?]/)[0] || `Key Highlight #${clipIndex}`;
			const title =
				firstSentence.length > 50
					? `${firstSentence.slice(0, 47)}...`
					: firstSentence;

			clips.push({
				id: generateUUID(),
				title: title.trim(),
				hook: `Hook: "${currentText.trim().slice(0, 60)}..."`,
				summary: currentText.trim().slice(0, 140),
				startTime: Math.round(currentClipStart * 10) / 10,
				endTime: Math.round(seg.end * 10) / 10,
				duration: Math.round(currentDuration * 10) / 10,
				viralityScore,
				tags: ["Viral", "Highlight", "Key Insight"],
			});

			clipIndex++;
			currentClipStart = null;
			currentText = "";

			if (clips.length >= 6) break;
		}
	}

	return clips.sort((a, b) => b.viralityScore - a.viralityScore);
}

/**
 * Main AI Clipper pipeline:
 * Analyzes speech transcript segments and queries custom LLM for viral clips.
 */
export async function generateViralClips({
	transcript,
	focusPrompt = "Find the most captivating, insightful, and viral moments suitable for TikTok, Reels, and Shorts",
	targetDuration = "medium",
	config = {},
}: GenerateClipsOptions): Promise<ClipHighlight[]> {
	if (!transcript || transcript.length === 0) {
		return [];
	}

	const {
		baseUrl = "https://api.openai.com/v1",
		apiKey = "",
		model = "gpt-4o",
		temperature = 0.7,
	} = config;

	// If no API key or local base URL, use local heuristic fallback
	if (
		!apiKey &&
		!baseUrl.includes("localhost") &&
		!baseUrl.includes("127.0.0.1")
	) {
		return generateHeuristicClips({ transcript, targetDuration });
	}

	const transcriptPrompt = transcript
		.map(
			(s) => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.text.trim()}`,
		)
		.join("\n");

	const systemPrompt = `You are an elite video editor and viral content strategist (like OpusClip and Klap).
Analyze the provided timed transcript and extract the top 3 to 6 best highlight clips for YouTube Shorts, Instagram Reels, and TikTok.

Rules:
1. Each clip must have a strong hook in the first 3 seconds.
2. Target clip duration: ${targetDuration} (${targetDuration === "short" ? "15-30s" : targetDuration === "medium" ? "30-60s" : "60-90s"}).
3. Return ONLY a valid JSON array of objects with the following schema:
[
  {
    "title": "Short catchy title",
    "hook": "Opening sentence or punchline hook",
    "summary": "1-2 sentence description of why this moment is compelling",
    "startTime": 12.5,
    "endTime": 45.0,
    "viralityScore": 95,
    "tags": ["Topic1", "Topic2"]
  }
]`;

	const userContent = `Focus Goal: ${focusPrompt}\n\nTranscript:\n${transcriptPrompt}`;

	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (apiKey) {
			headers.Authorization = `Bearer ${apiKey}`;
		}

		const response = await fetch(
			`${baseUrl.replace(/\/+$/, "")}/chat/completions`,
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					model,
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: userContent },
					],
					temperature,
				}),
			},
		);

		if (!response.ok) {
			console.warn("LLM API failed, falling back to local heuristic clipper");
			return generateHeuristicClips({ transcript, targetDuration });
		}

		const data = await response.json();
		const rawReply = data?.choices?.[0]?.message?.content;
		if (!rawReply) {
			return generateHeuristicClips({ transcript, targetDuration });
		}

		const parsed = extractJsonFromLlmResponse(rawReply) as Array<{
			title: string;
			hook: string;
			summary: string;
			startTime: number;
			endTime: number;
			viralityScore: number;
			tags: string[];
		}>;

		if (!Array.isArray(parsed)) {
			return generateHeuristicClips({ transcript, targetDuration });
		}

		return parsed
			.map((item) => ({
				id: generateUUID(),
				title: item.title || "Untitled Clip",
				hook: item.hook || "",
				summary: item.summary || "",
				startTime: Number(item.startTime) || 0,
				endTime: Number(item.endTime) || 0,
				duration: Math.max(
					1,
					Math.round(
						((Number(item.endTime) || 0) - (Number(item.startTime) || 0)) * 10,
					) / 10,
				),
				viralityScore: Math.min(
					100,
					Math.max(0, Number(item.viralityScore) || 80),
				),
				tags: Array.isArray(item.tags) ? item.tags : ["Viral", "Shorts"],
			}))
			.sort((a, b) => b.viralityScore - a.viralityScore);
	} catch (error) {
		console.warn(
			"Failed to generate clips via LLM API, using heuristic fallback:",
			error,
		);
		return generateHeuristicClips({ transcript, targetDuration });
	}
}
