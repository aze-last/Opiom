"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import { useTranscriptEditorStore } from "@/stores/transcript-editor-store";
import {
	parseTranscriptWords,
	detectFillerWords,
	convertWordsToSilenceCuts,
	type TranscriptWord,
} from "@/lib/transcription/word-parser";
import { computeSilenceCuts } from "@/lib/timeline/silence-cut";
import type { TimelineElement } from "@/lib/timeline/types";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { extractTimelineAudio } from "@/lib/media/mediabunny";
import { decodeAudioToFloat32 } from "@/lib/media/audio";
import { DEFAULT_TRANSCRIPTION_SAMPLE_RATE } from "@/lib/transcription/audio";
import { transcriptionService } from "@/services/transcription/service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	ScissorIcon,
	SparklesIcon,
	Delete02Icon,
	AiBrain05Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/utils/ui";

export function TranscriptEditorView() {
	const editor = useEditor();
	const currentTimeTicks = useEditor((e) => e.playback.getCurrentTime());
	const currentTimeSeconds = currentTimeTicks / TICKS_PER_SECOND;

	const {
		segments,
		setSegments,
		selectedWordIds,
		toggleSelectWord,
		clearSelectedWords,
	} = useTranscriptEditorStore();

	const [isTranscribing, setIsTranscribing] = useState(false);
	const [transcribeProgress, setTranscribeProgress] = useState<string>("");
	const [isApplyingCut, setIsApplyingCut] = useState(false);

	// Parse segments into words with detected filler words
	const words = useMemo(() => {
		if (segments.length === 0) return [];
		const rawWords = parseTranscriptWords({ segments });
		return detectFillerWords({ words: rawWords });
	}, [segments]);

	// Filter out words that are marked as filler
	const fillerWords = useMemo(() => words.filter((w) => w.isFiller), [words]);

	// Transcribe audio from timeline
	const handleTranscribeTimeline = async () => {
		setIsTranscribing(true);
		setTranscribeProgress("Extracting timeline audio...");
		const toastId = toast.loading("Analyzing timeline audio...");

		try {
			const activeScene = editor.scenes.getActiveSceneOrNull();
			if (!activeScene) throw new Error("No active scene");

			const audioBlob = await extractTimelineAudio({
				tracks: activeScene.tracks,
				mediaAssets: editor.media.getAssets(),
				totalDuration: editor.timeline.getTotalDuration(),
			});

			setTranscribeProgress("Decoding audio samples...");
			const { samples } = await decodeAudioToFloat32({
				audioBlob,
				sampleRate: DEFAULT_TRANSCRIPTION_SAMPLE_RATE,
			});

			setTranscribeProgress("Running AI transcription...");
			const result = await transcriptionService.transcribe({
				audioData: samples,
				onProgress: (p) => {
					if (p.status === "loading-model") {
						setTranscribeProgress(
							`Loading AI model (${Math.round(p.progress)}%)...`,
						);
					} else if (p.status === "transcribing") {
						setTranscribeProgress("Transcribing spoken words...");
					}
				},
			});

			if (!result.segments || result.segments.length === 0) {
				throw new Error("No spoken dialogue found in timeline audio");
			}

			setSegments(result.segments);
			toast.success(
				`Transcribed ${result.segments.length} speech segments successfully!`,
				{ id: toastId },
			);
		} catch (error) {
			console.error("Transcription error:", error);
			toast.error(
				error instanceof Error ? error.message : "Transcription failed",
				{ id: toastId },
			);
		} finally {
			setIsTranscribing(false);
			setTranscribeProgress("");
		}
	};

	// Seek to word timecode
	const handleWordClick = (word: TranscriptWord, e: React.MouseEvent) => {
		if (e.shiftKey || e.metaKey || e.ctrlKey) {
			// Multi-select for deletion
			toggleSelectWord(word.id, true);
		} else {
			// Seek playhead directly to word start
			editor.playback.seek({
				time: Math.round(word.start * TICKS_PER_SECOND),
			});
		}
	};

	// Cut selected words or all filler words from timeline
	const handleCutWords = (wordsToCut: TranscriptWord[]) => {
		if (wordsToCut.length === 0) return;

		const activeScene = editor.scenes.getActiveSceneOrNull();
		if (!activeScene) {
			toast.error("No active scene");
			return;
		}

		setIsApplyingCut(true);
		const toastId = toast.loading(
			`Cutting ${wordsToCut.length} words from timeline...`,
		);

		try {
			// Convert words to silence cut intervals with 50ms safety padding
			const intervalsWithTicks = convertWordsToSilenceCuts({
				wordsToDelete: wordsToCut,
				paddingSeconds: 0.05,
			});

			const currentTracks = activeScene.tracks;

			const newMainTrack = {
				...currentTracks.main,
				elements: computeSilenceCuts({
					elements: currentTracks.main.elements,
					intervals: intervalsWithTicks,
				}),
			};

			const newOverlayTracks = currentTracks.overlay.map((track) => ({
				...track,
				elements: computeSilenceCuts({
					elements: track.elements as TimelineElement[],
					intervals: intervalsWithTicks,
				}),
			}));

			const newAudioTracks = currentTracks.audio.map((track) => ({
				...track,
				elements: computeSilenceCuts({
					elements: track.elements,
					intervals: intervalsWithTicks,
				}),
			}));

			const updatedTracks = {
				overlay: newOverlayTracks as typeof currentTracks.overlay,
				main: newMainTrack,
				audio: newAudioTracks,
			};

			editor.scenes.updateSceneTracks({ tracks: updatedTracks });
			editor.save.markDirty({ force: true });

			// Filter deleted words from current segments in store
			const cutWordIds = new Set(wordsToCut.map((w) => w.id));
			const remainingWords = words.filter((w) => !cutWordIds.has(w.id));
			const reconstructedSegments = [
				{
					text: remainingWords.map((w) => w.word).join(" "),
					start: remainingWords[0]?.start ?? 0,
					end: remainingWords[remainingWords.length - 1]?.end ?? 0,
				},
			];
			setSegments(remainingWords.length > 0 ? reconstructedSegments : []);
			clearSelectedWords();

			toast.success(
				`Successfully cut ${wordsToCut.length} words from video timeline!`,
				{ id: toastId },
			);
		} catch (error) {
			console.error("Text cut failed:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to cut words from timeline",
				{ id: toastId },
			);
		} finally {
			setIsApplyingCut(false);
		}
	};

	// 1. Empty State
	if (words.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
				<div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
					<HugeiconsIcon icon={AiBrain05Icon} className="size-6" />
				</div>
				<div className="space-y-1 max-w-xs">
					<h3 className="text-sm font-semibold text-foreground">
						Text-Based Video Editor
					</h3>
					<p className="text-xs text-muted-foreground">
						Edit your video by editing text, like a Google Doc. Automatically
						detect and remove filler words like &quot;um&quot;, &quot;uh&quot;,
						and &quot;like&quot;.
					</p>
				</div>
				<Button
					onClick={handleTranscribeTimeline}
					disabled={isTranscribing}
					className="h-9 px-4 text-xs gap-2"
				>
					{isTranscribing ? (
						<>
							<Spinner className="size-3.5" />
							<span>{transcribeProgress || "Transcribing Audio..."}</span>
						</>
					) : (
						<>
							<HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
							<span>Transcribe Timeline Audio</span>
						</>
					)}
				</Button>
			</div>
		);
	}

	const selectedWordsList = words.filter((w) => selectedWordIds.includes(w.id));

	return (
		<div className="flex flex-col h-full overflow-hidden select-none">
			{/* Top Triage Action Bar */}
			<div className="shrink-0 p-2.5 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-semibold text-foreground">
						{words.length} words
					</span>
					{fillerWords.length > 0 && (
						<Badge
							variant="secondary"
							className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-medium px-1.5 py-0"
						>
							{fillerWords.length} filler word
							{fillerWords.length > 1 ? "s" : ""}
						</Badge>
					)}
				</div>

				<div className="flex items-center gap-1.5">
					{/* 1-Click Remove All Filler Words */}
					{fillerWords.length > 0 && (
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
							onClick={() => handleCutWords(fillerWords)}
							disabled={isApplyingCut}
						>
							<HugeiconsIcon icon={ScissorIcon} className="size-3.5" />
							<span>Remove All Fillers ({fillerWords.length})</span>
						</Button>
					)}

					{/* Cut Selected Words */}
					{selectedWordsList.length > 0 && (
						<Button
							variant="destructive"
							size="sm"
							className="h-7 text-xs gap-1"
							onClick={() => handleCutWords(selectedWordsList)}
							disabled={isApplyingCut}
						>
							<HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
							<span>Cut Selected ({selectedWordsList.length})</span>
						</Button>
					)}

					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs text-muted-foreground hover:text-foreground"
						onClick={handleTranscribeTimeline}
						disabled={isTranscribing}
					>
						{isTranscribing ? <Spinner className="size-3" /> : "Re-transcribe"}
					</Button>
				</div>
			</div>

			{/* Interactive Words Canvas */}
			<div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-sm leading-relaxed">
				<div className="flex flex-wrap gap-x-1.5 gap-y-2 items-center">
					{words.map((word) => {
						const isActive =
							currentTimeSeconds >= word.start && currentTimeSeconds < word.end;
						const isSelected = selectedWordIds.includes(word.id);

						return (
							<TooltipProvider key={word.id} delayDuration={300}>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={(e) => handleWordClick(word, e)}
											className={cn(
												"inline-flex items-center cursor-pointer transition-all duration-75 px-1 py-0.5 rounded text-xs select-none",
												isActive &&
													"bg-primary/25 text-primary font-semibold ring-1 ring-primary/40 shadow-xs",
												!isActive &&
													word.isFiller &&
													"bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
												!isActive &&
													!word.isFiller &&
													!isSelected &&
													"text-foreground/90 hover:bg-muted/80",
												isSelected &&
													"line-through bg-destructive/20 text-destructive border border-destructive/40 font-normal",
											)}
										>
											{word.word}
										</button>
									</TooltipTrigger>
									<TooltipContent side="top" className="text-[10px] py-1 px-2">
										<p className="font-semibold">{word.word}</p>
										<p className="text-muted-foreground">
											{word.start.toFixed(2)}s - {word.end.toFixed(2)}s
											{word.isFiller && " • Detected Filler Word"}
										</p>
										<p className="text-[9px] text-muted-foreground/80 mt-0.5">
											Click to seek • Shift+Click to select for cut
										</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						);
					})}
				</div>
			</div>
		</div>
	);
}
