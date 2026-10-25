import { describe, expect, it } from "bun:test";
import {
	extractJsonFromLlmResponse,
	generateHeuristicClips,
	type TranscriptSnippet,
} from "../clipper-service";
import {
	useAiProviderStore,
	PROVIDER_PRESETS,
} from "@/stores/ai-provider-store";

describe("clipper-service & custom LLM integration", () => {
	it("extracts json from raw LLM response with markdown backticks", () => {
		const raw =
			'```json\n[{"title": "Secret to Coding", "viralityScore": 95}]\n```';
		const parsed = extractJsonFromLlmResponse(raw) as Array<{ title: string }>;
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed[0].title).toBe("Secret to Coding");
	});

	it("extracts json from plain JSON text without backticks", () => {
		const raw = '[{"title": "Plain Clip", "viralityScore": 88}]';
		const parsed = extractJsonFromLlmResponse(raw) as Array<{ title: string }>;
		expect(parsed[0].title).toBe("Plain Clip");
	});

	it("generates heuristic clips from transcript segments when offline", () => {
		const transcript: TranscriptSnippet[] = [
			{
				start: 0,
				end: 10,
				text: "Why does everyone make this mistake when editing video?",
			},
			{
				start: 10,
				end: 25,
				text: "The secret is simple. You never want dead air.",
			},
			{ start: 25, end: 40, text: "Always cut immediately to the action." },
			{
				start: 40,
				end: 55,
				text: "How you structure the first three seconds determines everything.",
			},
			{
				start: 55,
				end: 70,
				text: "Finally, test your hook with an aggressive auto-reframe.",
			},
		];

		const clips = generateHeuristicClips({
			transcript,
			targetDuration: "short",
		});

		expect(clips.length).toBeGreaterThan(0);
		expect(clips[0].viralityScore).toBeGreaterThanOrEqual(60);
		expect(clips[0].startTime).toBeDefined();
		expect(clips[0].endTime).toBeGreaterThan(clips[0].startTime);
		expect(clips[0].duration).toBeGreaterThan(0);
		expect(clips[0].title).toBeDefined();
	});

	it("switches AI provider presets and updates default models", () => {
		const store = useAiProviderStore.getState();
		store.setPreset("ollama");
		expect(useAiProviderStore.getState().preset).toBe("ollama");
		expect(useAiProviderStore.getState().baseUrl).toBe(
			PROVIDER_PRESETS.ollama.defaultBaseUrl,
		);
		expect(useAiProviderStore.getState().model).toBe(
			PROVIDER_PRESETS.ollama.defaultModel,
		);

		store.setPreset("deepseek");
		expect(useAiProviderStore.getState().baseUrl).toBe(
			"https://api.deepseek.com/v1",
		);
		expect(useAiProviderStore.getState().model).toBe("deepseek-chat");

		store.setApiKey("test-secret-key-123");
		expect(useAiProviderStore.getState().apiKey).toBe("test-secret-key-123");
	});
});
