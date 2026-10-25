"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Slider } from "@/components/ui/slider";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEditor } from "@/hooks/use-editor";
import { falService, type FalAspectRatio } from "@/services/ai/fal-service";
import { processMediaAssets } from "@/lib/media/processing";
import { buildElementFromMedia } from "@/lib/timeline/element-utils";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/lib/timeline/creation";
import {
	Image02Icon,
	HeadphonesIcon,
	MusicNote03Icon,
	PlusSignIcon,
	Download01Icon,
	SparklesIcon,
	ScissorIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AIClipperContent } from "./ai-clipper";

const IMAGE_SUGGESTIONS = [
	"Cinematic drone shot of misty pine mountains at sunrise, 8k hyperrealistic",
	"Cyberpunk neon street market with rain reflections and holographic signs",
	"Minimalist modern interior with large window and soft morning sunlight",
	"Dramatic macro close-up of an eagle eye with high detail and depth of field",
];

const SFX_SUGGESTIONS = [
	"Cinematic deep bass drop impact with atmospheric sub whoosh",
	"Mechanical keyboard typing rapidly in a quiet studio",
	"Futuristic sci-fi UI digital beep notification chime",
	"Gentle ocean waves rolling onto smooth pebble shore",
];

export function AIStudioView() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());

	const [activeSubTab, setActiveSubTab] = useState<
		"image" | "voice" | "sfx" | "clipper"
	>("image");

	// Image state
	const [imagePrompt, setImagePrompt] = useState("");
	const [imageAspect, setImageAspect] = useState<FalAspectRatio>("16:9");
	const [isGeneratingImage, setIsGeneratingImage] = useState(false);
	const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
		null,
	);

	// TTS Voiceover state
	const [voiceScript, setVoiceScript] = useState("");
	const [voiceStyle, setVoiceStyle] = useState("natural");
	const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
	const [generatedVoiceUrl, setGeneratedVoiceUrl] = useState<string | null>(
		null,
	);

	// Sound FX state
	const [sfxPrompt, setSfxPrompt] = useState("");
	const [sfxDuration, setSfxDuration] = useState(4);
	const [isGeneratingSfx, setIsGeneratingSfx] = useState(false);
	const [generatedSfxUrl, setGeneratedSfxUrl] = useState<string | null>(null);

	// Helper to ingest URL into OpenCut asset library & timeline
	const ingestMedia = async ({
		url,
		name,
		mimeType,
		addToTimeline = false,
	}: {
		url: string;
		name: string;
		mimeType: string;
		addToTimeline?: boolean;
	}) => {
		if (!activeProject) {
			toast.error("No active project");
			return;
		}

		const toastId = toast.loading(`Saving ${name} to project assets...`);
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to download generated media asset");
			const blob = await res.blob();
			const file = new File([blob], name, { type: blob.type || mimeType });

			const processedAssets = await processMediaAssets({ files: [file] });
			if (processedAssets.length === 0) {
				throw new Error("Failed to process media asset");
			}

			const asset = processedAssets[0];
			const addedAsset = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset,
			});
			if (!addedAsset) {
				throw new Error("Failed to save media asset");
			}

			if (addToTimeline) {
				const duration =
					asset.duration != null
						? Math.round(asset.duration * TICKS_PER_SECOND)
						: DEFAULT_NEW_ELEMENT_DURATION;
				const playheadTime = editor.playback.getCurrentTime();
				const startTime = Math.round(playheadTime * TICKS_PER_SECOND);

				const element = buildElementFromMedia({
					mediaId: addedAsset.id,
					mediaType: addedAsset.type,
					name: addedAsset.name,
					duration,
					startTime,
				});

				editor.timeline.insertElement({
					element,
					placement: { mode: "auto" },
				});

				toast.success(`Inserted ${name} onto timeline`, { id: toastId });
			} else {
				toast.success(`Saved ${name} to Assets`, { id: toastId });
			}
		} catch (error) {
			console.error("Failed to ingest media:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to import asset",
				{ id: toastId },
			);
		}
	};

	const handleGenerateImage = async () => {
		if (!imagePrompt.trim()) {
			toast.error("Please enter an image prompt");
			return;
		}

		setIsGeneratingImage(true);
		try {
			const result = await falService.generateImage({
				prompt: imagePrompt.trim(),
				aspectRatio: imageAspect,
			});
			setGeneratedImageUrl(result.imageUrl);
			toast.success("Image generated successfully!");
		} catch (error) {
			console.error("Fal image generation error:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Image generation failed. Ensure FAL_KEY is configured.",
			);
		} finally {
			setIsGeneratingImage(false);
		}
	};

	const handleGenerateVoice = async () => {
		if (!voiceScript.trim()) {
			toast.error("Please enter a voiceover script");
			return;
		}

		setIsGeneratingVoice(true);
		try {
			const result = await falService.generateSpeech({
				text: voiceScript.trim(),
				voice: voiceStyle,
			});
			setGeneratedVoiceUrl(result.audioUrl);
			toast.success("Voiceover generated successfully!");
		} catch (error) {
			console.error("Fal voice generation error:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Voiceover generation failed. Ensure FAL_KEY is configured.",
			);
		} finally {
			setIsGeneratingVoice(false);
		}
	};

	const handleGenerateSfx = async () => {
		if (!sfxPrompt.trim()) {
			toast.error("Please enter a sound description");
			return;
		}

		setIsGeneratingSfx(true);
		try {
			const result = await falService.generateSoundEffect({
				prompt: sfxPrompt.trim(),
				durationSeconds: sfxDuration,
			});
			setGeneratedSfxUrl(result.audioUrl);
			toast.success("Sound effect generated successfully!");
		} catch (error) {
			console.error("Fal SFX generation error:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Sound effect generation failed. Ensure FAL_KEY is configured.",
			);
		} finally {
			setIsGeneratingSfx(false);
		}
	};

	// Word count for script
	const scriptWordCount = voiceScript.trim()
		? voiceScript.trim().split(/\s+/).length
		: 0;
	const estimatedSeconds = Math.round((scriptWordCount / 140) * 60);

	return (
		<PanelView
			title="AI Generative Studio"
			className="h-full select-none"
			contentClassName="p-3 space-y-4"
		>
			<Tabs
				value={activeSubTab}
				onValueChange={(val) =>
					setActiveSubTab(val as "image" | "voice" | "sfx" | "clipper")
				}
				className="w-full"
			>
				<TabsList className="grid grid-cols-4 w-full bg-muted/60 p-1 rounded-lg">
					<TabsTrigger
						value="image"
						className="flex items-center gap-1.5 text-xs py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
					>
						<HugeiconsIcon icon={Image02Icon} className="size-3.5" />
						<span>B-Roll</span>
					</TabsTrigger>
					<TabsTrigger
						value="voice"
						className="flex items-center gap-1.5 text-xs py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
					>
						<HugeiconsIcon icon={HeadphonesIcon} className="size-3.5" />
						<span>Voice</span>
					</TabsTrigger>
					<TabsTrigger
						value="sfx"
						className="flex items-center gap-1.5 text-xs py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
					>
						<HugeiconsIcon icon={MusicNote03Icon} className="size-3.5" />
						<span>SFX</span>
					</TabsTrigger>
					<TabsTrigger
						value="clipper"
						className="flex items-center gap-1.5 text-xs py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
					>
						<HugeiconsIcon icon={ScissorIcon} className="size-3.5" />
						<span>Clipper</span>
					</TabsTrigger>
				</TabsList>

				{/* 1. IMAGE & B-ROLL GENERATOR */}
				<TabsContent value="image" className="mt-3 space-y-3">
					<div className="space-y-1.5">
						<span className="text-xs font-medium text-foreground flex items-center justify-between">
							<span>Prompt</span>
							<span className="text-[10px] text-muted-foreground">
								Powered by Flux / fal.ai
							</span>
						</span>
						<Textarea
							placeholder="Describe your scene or image..."
							value={imagePrompt}
							onChange={(e) => setImagePrompt(e.target.value)}
							className="min-h-20 text-xs resize-none"
						/>
					</div>

					{/* Quick Suggestions */}
					<div className="space-y-1">
						<span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
							Suggestions
						</span>
						<div className="flex flex-wrap gap-1">
							{IMAGE_SUGGESTIONS.map((sug) => (
								<button
									key={sug}
									type="button"
									onClick={() => setImagePrompt(sug)}
									className="text-[10px] text-left px-2 py-1 bg-muted/60 hover:bg-muted text-foreground/80 rounded transition-colors"
								>
									{sug.slice(0, 32)}...
								</button>
							))}
						</div>
					</div>

					{/* Aspect Ratio Selector */}
					<div className="space-y-1.5">
						<span className="text-xs font-medium text-foreground block">
							Aspect Ratio
						</span>
						<div className="grid grid-cols-3 gap-2">
							{(["16:9", "9:16", "1:1"] as const).map((ratio) => (
								<Button
									key={ratio}
									type="button"
									variant={imageAspect === ratio ? "secondary" : "outline"}
									size="sm"
									className="h-8 text-xs font-medium"
									onClick={() => setImageAspect(ratio)}
								>
									{ratio === "16:9" && "16:9 (Landscape)"}
									{ratio === "9:16" && "9:16 (Vertical)"}
									{ratio === "1:1" && "1:1 (Square)"}
								</Button>
							))}
						</div>
					</div>

					<Button
						className="w-full h-9 flex items-center justify-center gap-2 mt-2"
						onClick={handleGenerateImage}
						disabled={isGeneratingImage || !imagePrompt.trim()}
					>
						{isGeneratingImage ? (
							<>
								<Spinner className="size-4" />
								<span>Generating via fal.ai...</span>
							</>
						) : (
							<>
								<HugeiconsIcon icon={SparklesIcon} className="size-4" />
								<span>Generate Image</span>
							</>
						)}
					</Button>

					{/* Image Preview Result */}
					{generatedImageUrl && (
						<div className="border border-border/80 rounded-lg p-2.5 bg-muted/20 space-y-2 mt-3">
							<div className="relative w-full aspect-video rounded overflow-hidden bg-black/40 flex items-center justify-center">
								{/* Next Image preview */}
								{/* biome-ignore lint/performance/noImgElement: dynamic external fal.ai image url */}
								<img
									src={generatedImageUrl}
									alt="AI Generated"
									className="w-full h-full object-contain"
								/>
							</div>
							<div className="flex gap-2">
								<Button
									variant="default"
									size="sm"
									className="flex-1 text-xs h-8 gap-1.5"
									onClick={() =>
										ingestMedia({
											url: generatedImageUrl,
											name: `AI_Image_${Date.now()}.png`,
											mimeType: "image/png",
											addToTimeline: true,
										})
									}
								>
									<HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
									<span>Add to Timeline</span>
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="text-xs h-8 gap-1.5"
									onClick={() =>
										ingestMedia({
											url: generatedImageUrl,
											name: `AI_Image_${Date.now()}.png`,
											mimeType: "image/png",
											addToTimeline: false,
										})
									}
								>
									<HugeiconsIcon icon={Download01Icon} className="size-3.5" />
									<span>Save to Assets</span>
								</Button>
							</div>
						</div>
					)}
				</TabsContent>

				{/* 2. VOICEOVER / TTS GENERATOR */}
				<TabsContent value="voice" className="mt-3 space-y-3">
					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-foreground">
								Script Text
							</span>
							<span className="text-[10px] text-muted-foreground">
								{scriptWordCount} words (~{estimatedSeconds}s)
							</span>
						</div>
						<Textarea
							placeholder="Enter text or paste a script to narrate..."
							value={voiceScript}
							onChange={(e) => setVoiceScript(e.target.value)}
							className="min-h-24 text-xs resize-none"
						/>
					</div>

					<div className="space-y-1.5">
						<span className="text-xs font-medium text-foreground block">
							Voice Persona
						</span>
						<Select value={voiceStyle} onValueChange={setVoiceStyle}>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue placeholder="Select voice style" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="natural">
									Natural & Conversational
								</SelectItem>
								<SelectItem value="studio">Professional Studio Host</SelectItem>
								<SelectItem value="narrator">
									Documentary Narrator (Deep)
								</SelectItem>
								<SelectItem value="warm">Warm & Empathetic</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Button
						className="w-full h-9 flex items-center justify-center gap-2 mt-2"
						onClick={handleGenerateVoice}
						disabled={isGeneratingVoice || !voiceScript.trim()}
					>
						{isGeneratingVoice ? (
							<>
								<Spinner className="size-4" />
								<span>Synthesizing Voice...</span>
							</>
						) : (
							<>
								<HugeiconsIcon icon={SparklesIcon} className="size-4" />
								<span>Generate Speech</span>
							</>
						)}
					</Button>

					{/* Voice Audio Preview */}
					{generatedVoiceUrl && (
						<div className="border border-border/80 rounded-lg p-2.5 bg-muted/20 space-y-2 mt-3">
							{/* biome-ignore lint/a11y/useMediaCaption: dynamic generated preview */}
							<audio controls className="w-full h-9" src={generatedVoiceUrl}>
								Your browser does not support audio playback.
							</audio>
							<div className="flex gap-2">
								<Button
									variant="default"
									size="sm"
									className="flex-1 text-xs h-8 gap-1.5"
									onClick={() =>
										ingestMedia({
											url: generatedVoiceUrl,
											name: `Voiceover_${Date.now()}.mp3`,
											mimeType: "audio/mpeg",
											addToTimeline: true,
										})
									}
								>
									<HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
									<span>Add to Timeline</span>
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="text-xs h-8 gap-1.5"
									onClick={() =>
										ingestMedia({
											url: generatedVoiceUrl,
											name: `Voiceover_${Date.now()}.mp3`,
											mimeType: "audio/mpeg",
											addToTimeline: false,
										})
									}
								>
									<HugeiconsIcon icon={Download01Icon} className="size-3.5" />
									<span>Save to Assets</span>
								</Button>
							</div>
						</div>
					)}
				</TabsContent>

				{/* 3. SOUND FX GENERATOR */}
				<TabsContent value="sfx" className="mt-3 space-y-3">
					<div className="space-y-1.5">
						<span className="text-xs font-medium text-foreground block">
							Sound Effect Prompt
						</span>
						<Input
							placeholder="e.g. Cinematic whoosh, sci-fi door slide, laser zap..."
							value={sfxPrompt}
							onChange={(e) => setSfxPrompt(e.target.value)}
							className="h-8 text-xs"
						/>
					</div>

					<div className="space-y-1">
						<span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
							Suggestions
						</span>
						<div className="flex flex-wrap gap-1">
							{SFX_SUGGESTIONS.map((sug) => (
								<button
									key={sug}
									type="button"
									onClick={() => setSfxPrompt(sug)}
									className="text-[10px] text-left px-2 py-1 bg-muted/60 hover:bg-muted text-foreground/80 rounded transition-colors"
								>
									{sug.slice(0, 30)}...
								</button>
							))}
						</div>
					</div>

					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-foreground">
								Duration
							</span>
							<span className="text-xs text-muted-foreground">
								{sfxDuration} seconds
							</span>
						</div>
						<Slider
							value={[sfxDuration]}
							min={1}
							max={10}
							step={1}
							onValueChange={(val) => setSfxDuration(val[0] ?? 4)}
						/>
					</div>

					<Button
						className="w-full h-9 flex items-center justify-center gap-2 mt-2"
						onClick={handleGenerateSfx}
						disabled={isGeneratingSfx || !sfxPrompt.trim()}
					>
						{isGeneratingSfx ? (
							<>
								<Spinner className="size-4" />
								<span>Generating Audio Effect...</span>
							</>
						) : (
							<>
								<HugeiconsIcon icon={SparklesIcon} className="size-4" />
								<span>Generate Sound FX</span>
							</>
						)}
					</Button>

					{/* SFX Audio Preview */}
					{generatedSfxUrl && (
						<div className="border border-border/80 rounded-lg p-2.5 bg-muted/20 space-y-2 mt-3">
							{/* biome-ignore lint/a11y/useMediaCaption: dynamic generated preview */}
							<audio controls className="w-full h-9" src={generatedSfxUrl}>
								Your browser does not support audio playback.
							</audio>
							<div className="flex gap-2">
								<Button
									variant="default"
									size="sm"
									className="flex-1 text-xs h-8 gap-1.5"
									onClick={() =>
										ingestMedia({
											url: generatedSfxUrl,
											name: `SFX_${Date.now()}.mp3`,
											mimeType: "audio/mpeg",
											addToTimeline: true,
										})
									}
								>
									<HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
									<span>Add to Timeline</span>
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="text-xs h-8 gap-1.5"
									onClick={() =>
										ingestMedia({
											url: generatedSfxUrl,
											name: `SFX_${Date.now()}.mp3`,
											mimeType: "audio/mpeg",
											addToTimeline: false,
										})
									}
								>
									<HugeiconsIcon icon={Download01Icon} className="size-3.5" />
									<span>Save to Assets</span>
								</Button>
							</div>
						</div>
					)}
				</TabsContent>

				{/* 4. AI CLIPPER */}
				<TabsContent value="clipper" className="mt-3">
					<AIClipperContent />
				</TabsContent>
			</Tabs>
		</PanelView>
	);
}
