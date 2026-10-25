import { describe, expect, it } from "bun:test";
import {
	mapAspectRatioToFalImageSize,
	formatFalSpeechPayload,
	formatFalImagePayload,
} from "../fal-service";

describe("fal-service payload formatters", () => {
	it("maps standard aspect ratios to Fal image size tokens", () => {
		expect(mapAspectRatioToFalImageSize("16:9")).toBe("landscape_16_9");
		expect(mapAspectRatioToFalImageSize("9:16")).toBe("portrait_16_9");
		expect(mapAspectRatioToFalImageSize("1:1")).toBe("square_hd");
		expect(mapAspectRatioToFalImageSize("4:3")).toBe("landscape_4_3");
	});

	it("formats image generation payload for Flux", () => {
		const payload = formatFalImagePayload({
			prompt: "Cinematic drone shot of misty mountain peaks",
			aspectRatio: "16:9",
		});

		expect(payload.prompt).toBe("Cinematic drone shot of misty mountain peaks");
		expect(payload.image_size).toBe("landscape_16_9");
		expect(payload.num_images).toBe(1);
	});

	it("formats speech payload with selected voice and prompt text", () => {
		const payload = formatFalSpeechPayload({
			text: "Welcome to OpenCut AI video editor.",
			voice: "narrator-warm",
		});

		expect(payload.input).toBe("Welcome to OpenCut AI video editor.");
		expect(payload.voice).toBe("narrator-warm");
	});
});
