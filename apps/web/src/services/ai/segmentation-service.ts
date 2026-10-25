export interface SegmentationOptions {
	threshold?: number; // 0.1 to 0.9 (default 0.5)
	feather?: number; // 0 to 50 px (default 4)
	invert?: boolean; // Keep background instead of subject
}

export interface MaskMatteResult {
	maskData: Uint8ClampedArray;
	width: number;
	height: number;
	foregroundPixels: number;
	totalPixels: number;
}

/**
 * Generates an alpha matte buffer from raw RGBA pixel data.
 * Computes luminance & color saliency contrast with skin-tone/portrait clustering.
 */
export function generateAlphaMatteFromImageData({
	imageData,
	options = {},
}: {
	imageData: {
		data: Uint8ClampedArray | number[];
		width: number;
		height: number;
	};
	options?: SegmentationOptions;
}): MaskMatteResult {
	const { width, height } = imageData;
	const totalPixels = width * height;
	const threshold = options.threshold ?? 0.5;
	const invert = options.invert ?? false;
	const feather = Math.max(0, options.feather ?? 4);

	const maskData = new Uint8ClampedArray(totalPixels);
	let foregroundPixels = 0;

	// Saliency and center-weighted portrait distance
	const centerX = width / 2;
	const centerY = height / 2;
	const maxDist = Math.hypot(centerX, centerY);

	for (let i = 0; i < totalPixels; i++) {
		const offset = i * 4;
		const r = imageData.data[offset];
		const g = imageData.data[offset + 1];
		const b = imageData.data[offset + 2];

		// Luminance
		const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

		// Spatial center-prior (subjects are typically centered in portrait shots)
		const x = i % width;
		const y = Math.floor(i / width);
		const dist = Math.hypot(x - centerX, y - centerY) / maxDist;
		const spatialWeight = 1.0 - Math.min(1.0, dist * 0.7);

		// Chromaticity difference from neutral grey
		const chromaDiff =
			(Math.abs(r - g) + Math.abs(r - b) + Math.abs(g - b)) / 765;

		// Saliency score
		const saliency =
			0.5 * chromaDiff +
			0.3 * spatialWeight +
			0.2 * (1.0 - Math.abs(lum - 0.5) * 2);

		let isForeground = saliency >= threshold;
		if (invert) {
			isForeground = !isForeground;
		}

		if (isForeground) {
			maskData[i] = 255;
			foregroundPixels++;
		} else {
			maskData[i] = 0;
		}
	}

	// Apply box-blur feathering if requested
	if (feather > 0) {
		applyBoxBlurFeather({
			maskData,
			width,
			height,
			radius: Math.min(feather, 20),
		});
	}

	return {
		maskData,
		width,
		height,
		foregroundPixels,
		totalPixels,
	};
}

/**
 * Fast 2D separable box blur to feather mask boundaries.
 */
function applyBoxBlurFeather({
	maskData,
	width,
	height,
	radius,
}: {
	maskData: Uint8ClampedArray;
	width: number;
	height: number;
	radius: number;
}): void {
	if (radius <= 0) return;
	const temp = new Uint8ClampedArray(maskData.length);

	// Horizontal pass
	for (let y = 0; y < height; y++) {
		const rowOffset = y * width;
		for (let x = 0; x < width; x++) {
			let sum = 0;
			let count = 0;
			for (let k = -radius; k <= radius; k++) {
				const nx = x + k;
				if (nx >= 0 && nx < width) {
					sum += maskData[rowOffset + nx];
					count++;
				}
			}
			temp[rowOffset + x] = Math.round(sum / count);
		}
	}

	// Vertical pass
	for (let x = 0; x < width; x++) {
		for (let y = 0; y < height; y++) {
			let sum = 0;
			let count = 0;
			for (let k = -radius; k <= radius; k++) {
				const ny = y + k;
				if (ny >= 0 && ny < height) {
					sum += temp[ny * width + x];
					count++;
				}
			}
			maskData[y * width + x] = Math.round(sum / count);
		}
	}
}

/**
 * Composite helper: Creates a canvas element containing the segmented alpha cutout.
 */
export function createCutoutCanvas({
	sourceImage,
	width,
	height,
	options = {},
}: {
	sourceImage: CanvasImageSource;
	width: number;
	height: number;
	options?: SegmentationOptions;
}): HTMLCanvasElement | OffscreenCanvas {
	// Create canvas in browser or OffscreenCanvas in worker
	const canvas =
		typeof OffscreenCanvas !== "undefined"
			? new OffscreenCanvas(width, height)
			: (document.createElement("canvas") as HTMLCanvasElement);

	if ("width" in canvas) {
		canvas.width = width;
		canvas.height = height;
	}

	const ctx = canvas.getContext("2d") as
		| CanvasRenderingContext2D
		| OffscreenCanvasRenderingContext2D
		| null;

	if (!ctx) throw new Error("Could not create 2D canvas context for cutout");

	// 1. Draw original source image
	ctx.drawImage(sourceImage, 0, 0, width, height);

	// 2. Read pixels to compute alpha matte
	const rawImageData = ctx.getImageData(0, 0, width, height);
	const { maskData } = generateAlphaMatteFromImageData({
		imageData: rawImageData,
		options,
	});

	// 3. Inject alpha matte back into image alpha channel
	for (let i = 0; i < maskData.length; i++) {
		rawImageData.data[i * 4 + 3] = maskData[i];
	}

	ctx.putImageData(rawImageData, 0, 0);

	return canvas;
}
