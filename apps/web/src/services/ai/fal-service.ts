export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3";

export type FalImageSize =
	| "landscape_16_9"
	| "portrait_16_9"
	| "square_hd"
	| "landscape_4_3";

export interface FalImageResult {
	url: string;
	width: number;
	height: number;
}

export interface FalSpeechResult {
	url: string;
	duration?: number;
}

export interface FalSoundResult {
	url: string;
}

export function mapAspectRatioToFalImageSize(ratio: AspectRatio): FalImageSize {
	switch (ratio) {
		case "16:9":
			return "landscape_16_9";
		case "9:16":
			return "portrait_16_9";
		case "1:1":
			return "square_hd";
		case "4:3":
			return "landscape_4_3";
		default:
			return "landscape_16_9";
	}
}

export function formatFalImagePayload({
	prompt,
	aspectRatio = "16:9",
}: {
	prompt: string;
	aspectRatio?: AspectRatio;
}) {
	return {
		prompt,
		image_size: mapAspectRatioToFalImageSize(aspectRatio),
		num_images: 1,
		enable_safety_checker: true,
	};
}

export function formatFalSpeechPayload({
	text,
	voice = "narrator-warm",
}: {
	text: string;
	voice?: string;
}) {
	return {
		input: text,
		voice,
	};
}

export class FalService {
	private proxyUrl = "/api/fal/proxy";

	async generateImage({
		prompt,
		aspectRatio = "16:9",
	}: {
		prompt: string;
		aspectRatio?: AspectRatio;
	}): Promise<FalImageResult> {
		const payload = formatFalImagePayload({ prompt, aspectRatio });

		const response = await fetch(
			`${this.proxyUrl}?targetUrl=${encodeURIComponent("https://fal.run/fal-ai/flux/schnell")}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			},
		);

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			throw new Error(
				err.message ||
					err.error ||
					`Image generation failed with status ${response.status}`,
			);
		}

		const data = await response.json();
		const image = data.images?.[0];
		if (!image?.url) {
			throw new Error("No image returned from Fal API");
		}

		return {
			url: image.url,
			width: image.width || (aspectRatio === "9:16" ? 1080 : 1920),
			height: image.height || (aspectRatio === "9:16" ? 1920 : 1080),
		};
	}

	async generateSpeech({
		text,
		voice = "narrator-warm",
	}: {
		text: string;
		voice?: string;
	}): Promise<FalSpeechResult> {
		const payload = formatFalSpeechPayload({ text, voice });

		const response = await fetch(
			`${this.proxyUrl}?targetUrl=${encodeURIComponent("https://fal.run/fal-ai/aura-tts")}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			},
		);

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			throw new Error(
				err.message ||
					err.error ||
					`Voice generation failed with status ${response.status}`,
			);
		}

		const data = await response.json();
		const audioUrl = data.audio?.url || data.url;
		if (!audioUrl) {
			throw new Error("No audio returned from Fal TTS API");
		}

		return {
			url: audioUrl,
			duration: data.duration,
		};
	}

	async generateSoundEffect({
		prompt,
	}: {
		prompt: string;
	}): Promise<FalSoundResult> {
		const response = await fetch(
			`${this.proxyUrl}?targetUrl=${encodeURIComponent("https://fal.run/fal-ai/stable-audio")}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt, seconds_total: 4 }),
			},
		);

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			throw new Error(
				err.message ||
					err.error ||
					`Sound effect generation failed with status ${response.status}`,
			);
		}

		const data = await response.json();
		const audioUrl = data.audio_file?.url || data.url;
		if (!audioUrl) {
			throw new Error("No sound effect returned from Fal API");
		}

		return { url: audioUrl };
	}
}

export const falService = new FalService();
