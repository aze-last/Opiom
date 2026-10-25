import { describe, expect, it } from "bun:test";
import { generateAlphaMatteFromImageData } from "../segmentation-service";

describe("segmentation service & alpha matte generation", () => {
	it("generates an alpha matte matching input width and height", () => {
		const width = 10;
		const height = 10;
		const data = new Uint8ClampedArray(width * height * 4);

		// Fill center with colored subject (high chroma, centered)
		for (let y = 3; y <= 6; y++) {
			for (let x = 3; x <= 6; x++) {
				const idx = (y * width + x) * 4;
				data[idx] = 230; // R
				data[idx + 1] = 80; // G
				data[idx + 2] = 60; // B
				data[idx + 3] = 255;
			}
		}

		const result = generateAlphaMatteFromImageData({
			imageData: { data, width, height },
			options: { threshold: 0.3, feather: 0 },
		});

		expect(result.width).toBe(10);
		expect(result.height).toBe(10);
		expect(result.totalPixels).toBe(100);
		expect(result.foregroundPixels).toBeGreaterThan(0);
		expect(result.maskData.length).toBe(100);
	});

	it("inverts alpha matte when invert option is true", () => {
		const width = 8;
		const height = 8;
		const data = new Uint8ClampedArray(width * height * 4);

		// Draw high contrast center
		for (let y = 2; y <= 5; y++) {
			for (let x = 2; x <= 5; x++) {
				const idx = (y * width + x) * 4;
				data[idx] = 255;
				data[idx + 1] = 50;
				data[idx + 2] = 50;
				data[idx + 3] = 255;
			}
		}

		const normal = generateAlphaMatteFromImageData({
			imageData: { data, width, height },
			options: { threshold: 0.35, feather: 0, invert: false },
		});

		const inverted = generateAlphaMatteFromImageData({
			imageData: { data, width, height },
			options: { threshold: 0.35, feather: 0, invert: true },
		});

		expect(normal.foregroundPixels + inverted.foregroundPixels).toBe(
			width * height,
		);
	});

	it("softens boundary values when feathering is enabled", () => {
		const width = 12;
		const height = 12;
		const data = new Uint8ClampedArray(width * height * 4);

		for (let y = 4; y <= 7; y++) {
			for (let x = 4; x <= 7; x++) {
				const idx = (y * width + x) * 4;
				data[idx] = 255;
				data[idx + 1] = 20;
				data[idx + 2] = 20;
				data[idx + 3] = 255;
			}
		}

		const feathered = generateAlphaMatteFromImageData({
			imageData: { data, width, height },
			options: { threshold: 0.3, feather: 2 },
		});

		// Check that intermediate values (between 0 and 255) exist along edges
		const hasFeatheredValues = Array.from(feathered.maskData).some(
			(val) => val > 0 && val < 255,
		);
		expect(hasFeatheredValues).toBe(true);
	});
});
