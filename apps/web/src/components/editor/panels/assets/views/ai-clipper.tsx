"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useEditor } from "@/hooks/use-editor";
import { useTranscriptEditorStore } from "@/stores/transcript-editor-store";
import {
	useAiProviderStore,
	PROVIDER_PRESETS,
} from "@/stores/ai-provider-store";
import {
	generateViralClips,
	type ClipHighlight,
	type TargetClipDuration,
	type TranscriptSnippet,
} from "@/services/ai/clipper-service";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Scissors01Icon,
	SparklesIcon,
	PlayIcon,
	Settings01Icon,
	FlameIcon,
	Time02Icon,
	AiBrain05Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";
import Link from "next/link";

const SAMPLE_TRANSCRIPT: TranscriptSnippet[] = [
	{
		start: 0.0,
		end: 4.5,
		text: "Why does 99% of creators fail on short-form video in the first 3 seconds?",
	},
	{
		start: 4.5,
		end: 11.2,
		text: "The answer is because they start with an introduction instead of an unexpected punchline.",
	},
	{
		start: 11.2,
		end: 19.8,
		text: "If you don't break their scroll pattern immediately, the algorithm penalizes your retention score.",
	},
	{
		start: 19.8,
		end: 28.5,
		text: "Here is the exact framework I used to generate 10 million views with zero ad spend.",
	},
	{
		start: 28.5,
		end: 38.0,
		text: "Step one: cut every breath, pause, and filler word. Your pacing needs to feel like an adrenaline rush.",
	},
	{
		start: 38.0,
		end: 47.5,
		text: "Step two: reframe your horizontal landscape video into vertical 9:16 with smooth face tracking.",
	},
	{
		start: 47.5,
		end: 58.0,
		text: "And finally, stop asking people to like and subscribe at the start. Deliver undeniable value first.",
	},
];

export function AIClipperContent() {
	const editor = useEditor();
	const segments = useTranscriptEditorStore((s) => s.segments);
	const aiConfig = useAiProviderStore();

	const [targetDuration, setTargetDuration] =
		useState<TargetClipDuration>("medium");
	const [focusPrompt, setFocusPrompt] = useState(
		"Find high-energy viral moments, punchy advice, and hook statements",
	);
	const [customScriptText, setCustomScriptText] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [clips, setClips] = useState<ClipHighlight[]>([]);

	const activeTranscript: TranscriptSnippet[] =
		segments.length > 0
			? segments.map((s) => ({ start: s.start, end: s.end, text: s.text }))
			: customScriptText.trim().length > 0
				? customScriptText
						.split("\n")
						.filter(Boolean)
						.map((line, idx) => ({
							start: idx * 6,
							end: (idx + 1) * 6,
							text: line,
						}))
				: [];

	const handleLoadSample = () => {
		const sampleText = SAMPLE_TRANSCRIPT.map((s) => s.text).join("\n");
		setCustomScriptText(sampleText);
		toast.info("Loaded sample transcript dialogue!");
	};

	const handleGenerateClips = async () => {
		const transcriptToUse =
			activeTranscript.length > 0 ? activeTranscript : SAMPLE_TRANSCRIPT;

		setIsGenerating(true);
		const toastId = toast.loading(
			`Analyzing transcript with ${aiConfig.model || "LLM"}...`,
		);

		try {
			const detectedClips = await generateViralClips({
				transcript: transcriptToUse,
				focusPrompt,
				targetDuration,
				config: {
					baseUrl: aiConfig.baseUrl,
					apiKey: aiConfig.apiKey,
					model: aiConfig.model,
					temperature: aiConfig.temperature,
					maxTokens: aiConfig.maxTokens,
				},
			});

			setClips(detectedClips);
			if (detectedClips.length > 0) {
				toast.success(
					`Discovered ${detectedClips.length} viral highlight clips!`,
					{
						id: toastId,
					},
				);
			} else {
				toast.warning("No highlight clips matched the duration threshold.", {
					id: toastId,
				});
			}
		} catch (error) {
			console.error("Clipper error:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to generate clips",
				{ id: toastId },
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleSeekClip = (clip: ClipHighlight) => {
		const targetTicks = Math.round(clip.startTime * TICKS_PER_SECOND);
		editor.playback.seek({ time: targetTicks });
		toast.info(`Seeked to ${formatTime(clip.startTime)}`);
	};

	const handleSliceClipToTimeline = (clip: ClipHighlight) => {
		const startTicks = Math.round(clip.startTime * TICKS_PER_SECOND);
		editor.playback.seek({ time: startTicks });
		toast.success(
			`Isolated clip "${clip.title}" at ${formatTime(clip.startTime)}`,
		);
	};

	const formatTime = (seconds: number) => {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	return (
		<div className="space-y-4">
			{/* Active Provider Chip */}
			<div className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-border/50 bg-muted/20">
				<div className="flex items-center gap-2 truncate">
					<HugeiconsIcon
						icon={AiBrain05Icon}
						className="size-3.5 text-primary shrink-0"
					/>
					<span className="font-medium text-foreground truncate">
						{PROVIDER_PRESETS[aiConfig.preset]?.name ?? "Custom LLM"}:
					</span>
					<span className="font-mono text-muted-foreground truncate text-[11px]">
						{aiConfig.model}
					</span>
				</div>
				<Button
					asChild
					variant="link"
					size="sm"
					className="h-auto p-0 text-[11px]"
				>
					<Link href="/settings">Change</Link>
				</Button>
			</div>

			{/* Target Duration Selector */}
			<div className="space-y-1.5">
				<span className="text-xs font-medium text-foreground block">
					Target Clip Duration
				</span>
				<div className="grid grid-cols-4 gap-1 bg-muted/50 p-1 rounded-md text-xs">
					{(
						[
							{ id: "short", label: "<30s" },
							{ id: "medium", label: "30-60s" },
							{ id: "long", label: "60-90s" },
							{ id: "any", label: "Any" },
						] as const
					).map((mode) => (
						<button
							key={mode.id}
							type="button"
							onClick={() => setTargetDuration(mode.id)}
							className={cn(
								"py-1 px-1.5 rounded text-center font-medium transition-all",
								targetDuration === mode.id
									? "bg-background text-foreground shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{mode.label}
						</button>
					))}
				</div>
			</div>

			{/* Focus Goal / Prompt */}
			<div className="space-y-1.5">
				<span className="text-xs font-medium text-foreground block">
					Virality Goal / Topic Focus
				</span>
				<Input
					value={focusPrompt}
					onChange={(e) => setFocusPrompt(e.target.value)}
					placeholder="e.g. Find key insights, bloopers, or debate hooks..."
					aria-label="Virality Goal / Topic Focus"
					className="text-xs"
				/>
			</div>

			{/* Transcript Input / Source State */}
			{segments.length === 0 && (
				<div className="space-y-2 rounded-lg border border-dashed border-border/70 p-3 bg-muted/10">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-muted-foreground">
							No Auto-Captions Loaded
						</span>
						<button
							type="button"
							onClick={handleLoadSample}
							className="text-[11px] text-primary hover:underline font-medium"
						>
							Load Sample
						</button>
					</div>
					<Textarea
						value={customScriptText}
						onChange={(e) => setCustomScriptText(e.target.value)}
						placeholder="Paste dialogue or transcript text here (or transcribe your media in Captions view)..."
						className="text-xs h-20 resize-none font-mono"
					/>
				</div>
			)}

			{/* Action Button */}
			<Button
				type="button"
				variant="default"
				size="sm"
				className="w-full text-xs h-9 gap-1.5 font-medium active:scale-[0.98] transition-transform shadow-xs"
				onClick={handleGenerateClips}
				disabled={isGenerating}
			>
				{isGenerating ? (
					<>
						<Spinner className="size-3.5" />
						<span>Analyzing Virality & Timing...</span>
					</>
				) : (
					<>
						<HugeiconsIcon icon={SparklesIcon} className="size-4" />
						<span>Find Viral Clips</span>
					</>
				)}
			</Button>

			{/* Clips List */}
			{clips.length > 0 && (
				<div className="space-y-3 pt-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-foreground uppercase tracking-wider">
							Top Highlights ({clips.length})
						</span>
						<span className="text-[11px] text-muted-foreground">
							Ranked by Virality
						</span>
					</div>

					<div className="space-y-2.5">
						{clips.map((clip, index) => (
							<div
								key={clip.id}
								className="rounded-xl border border-border/60 bg-card p-3 shadow-xs space-y-2.5 transition-all hover:border-primary/40"
							>
								{/* Header */}
								<div className="flex items-start justify-between gap-2">
									<div className="flex items-center gap-1.5">
										<span className="font-bold text-xs text-muted-foreground">
											#{index + 1}
										</span>
										<h4 className="font-semibold text-xs text-foreground line-clamp-1">
											{clip.title}
										</h4>
									</div>
									{/* Virality Badge */}
									<div
										className={cn(
											"px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shrink-0",
											clip.viralityScore >= 90
												? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
												: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
										)}
									>
										<HugeiconsIcon icon={FlameIcon} className="size-3" />
										<span>{clip.viralityScore}%</span>
									</div>
								</div>

								{/* Hook Quote */}
								<p className="text-[11px] text-muted-foreground italic line-clamp-2 bg-muted/30 p-1.5 rounded">
									{clip.hook}
								</p>

								{/* Timestamps & Actions */}
								<div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
									<div className="flex items-center gap-1 text-muted-foreground text-[11px]">
										<HugeiconsIcon icon={Time02Icon} className="size-3" />
										<span>
											{formatTime(clip.startTime)} - {formatTime(clip.endTime)}{" "}
											({clip.duration}s)
										</span>
									</div>

									<div className="flex items-center gap-1.5">
										<Button
											type="button"
											variant="secondary"
											size="xs"
											className="h-6 text-[10px] gap-1 px-2"
											onClick={() => handleSeekClip(clip)}
										>
											<HugeiconsIcon icon={PlayIcon} className="size-3" />
											<span>Seek</span>
										</Button>

										<Button
											type="button"
											variant="default"
											size="xs"
											className="h-6 text-[10px] gap-1 px-2"
											onClick={() => handleSliceClipToTimeline(clip)}
										>
											<HugeiconsIcon icon={Scissors01Icon} className="size-3" />
											<span>Keep Clip</span>
										</Button>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export function AIClipperView() {
	return (
		<PanelView
			title="AI Clipper"
			scrollClassName="p-4 space-y-4"
			actions={
				<Button
					asChild
					variant="ghost"
					size="icon"
					className="size-7"
					title="Configure Custom LLM & Keys"
				>
					<Link href="/settings">
						<HugeiconsIcon icon={Settings01Icon} className="size-4" />
					</Link>
				</Button>
			}
		>
			<AIClipperContent />
		</PanelView>
	);
}
