"use client";

import { useState, useCallback, useMemo } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useEditor } from "@/hooks/use-editor";
import { useTimelineStore } from "@/stores/timeline-store";
import { extractTimelineAudio } from "@/lib/media/mediabunny";
import { decodeAudioToFloat32 } from "@/lib/media/audio";
import {
	detectSilenceIntervals,
	type SilenceInterval,
	DEFAULT_SILENCE_THRESHOLD_DB,
	DEFAULT_MIN_SILENCE_DURATION_S,
	DEFAULT_SILENCE_PADDING_S,
} from "@/lib/media/silence-detector";
import {
	computeSilenceCuts,
	type SilenceIntervalWithTicks,
} from "@/lib/timeline/silence-cut";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { toast } from "sonner";
import { ScissorsIcon, VolumeMute02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function SilenceRemoverDialog() {
	const editor = useEditor();
	const isOpen = useTimelineStore((s) => s.silenceRemoverOpen);
	const setIsOpen = useTimelineStore((s) => s.setSilenceRemoverOpen);

	const [thresholdDb, setThresholdDb] = useState<number>(
		DEFAULT_SILENCE_THRESHOLD_DB,
	);
	const [minDuration, setMinDuration] = useState<number>(
		DEFAULT_MIN_SILENCE_DURATION_S,
	);
	const [paddingMs, setPaddingMs] = useState<number>(
		Math.round(DEFAULT_SILENCE_PADDING_S * 1000),
	);

	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [isApplying, setIsApplying] = useState(false);
	const [analyzedIntervals, setAnalyzedIntervals] = useState<
		SilenceInterval[] | null
	>(null);

	const totalSilenceDuration = useMemo(() => {
		if (!analyzedIntervals) return 0;
		return (
			Math.round(
				analyzedIntervals.reduce((acc, curr) => acc + curr.duration, 0) * 100,
			) / 100
		);
	}, [analyzedIntervals]);

	const handleScan = useCallback(async () => {
		const activeScene = editor.scenes.getActiveSceneOrNull();
		if (!activeScene) {
			toast.error("No active scene found");
			return;
		}

		const totalDuration = editor.timeline.getTotalDuration();
		if (totalDuration <= 0) {
			toast.error("Timeline is empty. Add video or audio clips first.");
			return;
		}

		setIsAnalyzing(true);
		setAnalyzedIntervals(null);

		try {
			const audioBlob = await extractTimelineAudio({
				tracks: activeScene.tracks,
				mediaAssets: editor.media.getAssets(),
				totalDuration,
			});

			const { samples, sampleRate } = await decodeAudioToFloat32({
				audioBlob,
				sampleRate: 16000,
			});

			const intervals = detectSilenceIntervals({
				samples,
				options: {
					sampleRate,
					thresholdDb,
					minDurationSeconds: minDuration,
					paddingSeconds: paddingMs / 1000,
				},
			});

			setAnalyzedIntervals(intervals);

			if (intervals.length === 0) {
				toast.info("No silence gaps detected with the selected threshold.");
			} else {
				const durationFormatted = (
					Math.round(
						intervals.reduce((acc, curr) => acc + curr.duration, 0) * 10,
					) / 10
				).toFixed(1);
				toast.success(
					`Found ${intervals.length} silent gap${intervals.length > 1 ? "s" : ""} (${durationFormatted}s dead air)`,
				);
			}
		} catch (error) {
			console.error("Silence analysis failed:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to analyze audio silence",
			);
		} finally {
			setIsAnalyzing(false);
		}
	}, [editor, thresholdDb, minDuration, paddingMs]);

	const handleApply = useCallback(() => {
		if (!analyzedIntervals || analyzedIntervals.length === 0) return;

		const activeScene = editor.scenes.getActiveSceneOrNull();
		if (!activeScene) return;

		setIsApplying(true);

		try {
			const intervalsWithTicks: SilenceIntervalWithTicks[] =
				analyzedIntervals.map((interval) => {
					const startTicks = Math.round(interval.start * TICKS_PER_SECOND);
					const endTicks = Math.round(interval.end * TICKS_PER_SECOND);
					return {
						startSeconds: interval.start,
						endSeconds: interval.end,
						startTicks,
						endTicks,
						durationTicks: endTicks - startTicks,
					};
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
					elements: track.elements,
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
				overlay: newOverlayTracks,
				main: newMainTrack,
				audio: newAudioTracks,
			};

			editor.scenes.updateSceneTracks({ tracks: updatedTracks });
			editor.save.markDirty({ force: true });

			toast.success(
				`Successfully removed ${analyzedIntervals.length} pause${
					analyzedIntervals.length > 1 ? "s" : ""
				} (${totalSilenceDuration}s saved)`,
			);

			setIsOpen(false);
			setAnalyzedIntervals(null);
		} catch (error) {
			console.error("Failed to apply silence cuts:", error);
			toast.error("Failed to cut silences from timeline");
		} finally {
			setIsApplying(false);
		}
	}, [analyzedIntervals, editor, setIsOpen, totalSilenceDuration]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[420px] bg-background/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-6">
				<DialogHeader className="space-y-1.5">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-lg bg-primary/10 text-primary">
							<HugeiconsIcon icon={ScissorsIcon} size={20} />
						</div>
						<div>
							<DialogTitle className="text-base font-semibold tracking-tight">
								Smart Silence Remover
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Detect and ripple-delete dead air pauses automatically
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="flex flex-col gap-5 py-3">
					{/* Threshold Slider */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium text-foreground">
								Silence Threshold
							</span>
							<Badge
								variant="secondary"
								className="font-mono text-[11px] px-2 py-0.5"
							>
								{thresholdDb} dB
							</Badge>
						</div>
						<Slider
							value={[thresholdDb]}
							min={-60}
							max={-20}
							step={1}
							onValueChange={(val) => {
								setThresholdDb(val[0]);
								setAnalyzedIntervals(null);
							}}
							className="py-1 cursor-pointer"
						/>
						<p className="text-[11px] text-muted-foreground">
							Audio below this volume is identified as silence (typical: -35
							dB).
						</p>
					</div>

					{/* Minimum Duration Slider */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium text-foreground">
								Minimum Gap Duration
							</span>
							<Badge
								variant="secondary"
								className="font-mono text-[11px] px-2 py-0.5"
							>
								{minDuration.toFixed(2)}s
							</Badge>
						</div>
						<Slider
							value={[minDuration]}
							min={0.2}
							max={2.0}
							step={0.05}
							onValueChange={(val) => {
								setMinDuration(val[0]);
								setAnalyzedIntervals(null);
							}}
							className="py-1 cursor-pointer"
						/>
						<p className="text-[11px] text-muted-foreground">
							Shorter pauses are preserved to maintain natural speech pacing.
						</p>
					</div>

					{/* Padding Buffer Slider */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium text-foreground">
								Speech Boundary Padding
							</span>
							<Badge
								variant="secondary"
								className="font-mono text-[11px] px-2 py-0.5"
							>
								{paddingMs}ms
							</Badge>
						</div>
						<Slider
							value={[paddingMs]}
							min={0}
							max={250}
							step={10}
							onValueChange={(val) => {
								setPaddingMs(val[0]);
								setAnalyzedIntervals(null);
							}}
							className="py-1 cursor-pointer"
						/>
						<p className="text-[11px] text-muted-foreground">
							Buffer left before and after words to avoid clipping consonants.
						</p>
					</div>

					{/* Results / Status Bar */}
					{analyzedIntervals && (
						<div className="rounded-xl border border-border bg-secondary/50 p-3 flex items-center justify-between text-xs">
							<div className="flex items-center gap-2">
								<HugeiconsIcon
									icon={VolumeMute02Icon}
									size={16}
									className="text-muted-foreground"
								/>
								<span className="font-medium text-foreground">
									{analyzedIntervals.length} pause
									{analyzedIntervals.length !== 1 ? "s" : ""} detected
								</span>
							</div>
							<span className="text-muted-foreground font-mono">
								{totalSilenceDuration}s dead air
							</span>
						</div>
					)}
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsOpen(false)}
						disabled={isAnalyzing || isApplying}
					>
						Cancel
					</Button>

					{!analyzedIntervals ? (
						<Button
							size="sm"
							onClick={() => void handleScan()}
							disabled={isAnalyzing}
							className="gap-1.5"
						>
							{isAnalyzing && <Spinner className="size-3.5" />}
							{isAnalyzing ? "Scanning Audio..." : "Scan Silences"}
						</Button>
					) : (
						<Button
							size="sm"
							onClick={handleApply}
							disabled={isApplying || analyzedIntervals.length === 0}
							className="gap-1.5 bg-primary text-primary-foreground"
						>
							{isApplying && <Spinner className="size-3.5" />}
							{isApplying
								? "Applying Ripple Cut..."
								: `Cut Silences (${totalSilenceDuration}s)`}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
