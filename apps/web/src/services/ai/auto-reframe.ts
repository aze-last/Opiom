import { generateUUID } from "@/utils/id";
import type {
	ElementAnimations,
	NumberAnimationBinding,
	ScalarAnimationKey,
} from "@/lib/animation/types";

export const TICKS_PER_SECOND = 120_000;

export type AutoReframeMotionPreset = "interview" | "standard" | "action";

export interface FocalSample {
	timeTicks: number;
	focalX: number; // Normalized -1.0 (far left) to +1.0 (far right), 0 is center
}

export interface ReframeKeyframe {
	time: number;
	position: { x: number; y: number };
}

export interface AutoReframeOptions {
	preset?: AutoReframeMotionPreset;
	sourceWidth?: number;
	sourceHeight?: number;
	targetWidth?: number;
	targetHeight?: number;
	sampleIntervalTicks?: number;
}

export const PRESET_CONFIGS: Record<
	AutoReframeMotionPreset,
	{ deadband: number; alpha: number }
> = {
	interview: { deadband: 0.15, alpha: 0.08 },
	standard: { deadband: 0.08, alpha: 0.2 },
	action: { deadband: 0.03, alpha: 0.5 },
};

/**
 * Calculates uniform scale factor to fill target canvas height and width
 * without black bars (Crop to Fill).
 */
export function calculateScaleToFill({
	sourceWidth,
	sourceHeight,
	targetWidth,
	targetHeight,
}: {
	sourceWidth: number;
	sourceHeight: number;
	targetWidth: number;
	targetHeight: number;
}): number {
	const scaleX = targetWidth / sourceWidth;
	const scaleY = targetHeight / sourceHeight;
	return Math.max(scaleX, scaleY);
}

/**
 * Calculates maximum horizontal panning margin in pixels
 * after scaling to fill.
 */
export function calculateMaxPanMargin({
	sourceWidth,
	scale,
	targetWidth,
}: {
	sourceWidth: number;
	scale: number;
	targetWidth: number;
}): number {
	const scaledWidth = sourceWidth * scale;
	return Math.max(0, (scaledWidth - targetWidth) / 2);
}

/**
 * Applies Deadband and Exponential Moving Average (EMA) smoothing to focal track.
 * Eliminates camera micro-shake, jitter, and rapid back-and-forth oscillation.
 */
export function smoothFocalTrajectory({
	samples,
	preset = "standard",
}: {
	samples: FocalSample[];
	preset?: AutoReframeMotionPreset;
}): FocalSample[] {
	if (samples.length <= 1) return [...samples];

	const { deadband, alpha } = PRESET_CONFIGS[preset];
	const smoothed: FocalSample[] = [];

	let currentFocal = samples[0].focalX;
	smoothed.push({ timeTicks: samples[0].timeTicks, focalX: currentFocal });

	for (let i = 1; i < samples.length; i++) {
		const raw = samples[i].focalX;
		const diff = Math.abs(raw - currentFocal);

		// If movement is within deadband threshold, do not move virtual camera
		if (diff > deadband) {
			currentFocal = currentFocal + alpha * (raw - currentFocal);
		}

		// Clamp within normalized bounds [-1.0, 1.0]
		currentFocal = Math.max(-1.0, Math.min(1.0, currentFocal));

		smoothed.push({
			timeTicks: samples[i].timeTicks,
			focalX: currentFocal,
		});
	}

	return smoothed;
}

/**
 * Generates synthetic or face-detector based focal samples across element duration.
 */
export function generateFocalSamples({
	durationTicks,
	intervalTicks = TICKS_PER_SECOND,
	initialCenter = 0,
	trajectoryFn,
}: {
	durationTicks: number;
	intervalTicks?: number;
	initialCenter?: number;
	trajectoryFn?: (timeSec: number) => number;
}): FocalSample[] {
	const samples: FocalSample[] = [];
	const step = Math.max(TICKS_PER_SECOND / 10, intervalTicks);

	for (let t = 0; t <= durationTicks; t += step) {
		const timeSec = t / TICKS_PER_SECOND;
		const rawX = trajectoryFn ? trajectoryFn(timeSec) : initialCenter;
		samples.push({
			timeTicks: t,
			focalX: Math.max(-1.0, Math.min(1.0, rawX)),
		});
	}

	if (samples[samples.length - 1].timeTicks < durationTicks) {
		const timeSec = durationTicks / TICKS_PER_SECOND;
		samples.push({
			timeTicks: durationTicks,
			focalX: trajectoryFn ? trajectoryFn(timeSec) : initialCenter,
		});
	}

	return samples;
}

/**
 * Builds ElementAnimations with vector2 transform.position binding and scalar channels.
 */
export function createReframeAnimations({
	keyframes,
	existingAnimations,
}: {
	keyframes: ReframeKeyframe[];
	existingAnimations?: ElementAnimations;
}): ElementAnimations {
	const channelIdX = `chan-pos-x-${generateUUID()}`;
	const channelIdY = `chan-pos-y-${generateUUID()}`;

	const bindingX: NumberAnimationBinding = {
		path: "transform.positionX",
		kind: "number",
		components: [{ key: "value", channelId: channelIdX }],
	};

	const bindingY: NumberAnimationBinding = {
		path: "transform.positionY",
		kind: "number",
		components: [{ key: "value", channelId: channelIdY }],
	};

	const keysX: ScalarAnimationKey[] = keyframes.map((k) => ({
		id: generateUUID(),
		time: k.time,
		value: k.position.x,
		segmentToNext: "linear",
		tangentMode: "auto",
	}));

	const keysY: ScalarAnimationKey[] = keyframes.map((k) => ({
		id: generateUUID(),
		time: k.time,
		value: k.position.y,
		segmentToNext: "linear",
		tangentMode: "auto",
	}));

	const nextBindings = {
		...(existingAnimations?.bindings ?? {}),
		"transform.positionX": bindingX,
		"transform.positionY": bindingY,
	};
	const nextChannels = {
		...(existingAnimations?.channels ?? {}),
		[channelIdX]: {
			kind: "scalar" as const,
			keys: keysX,
			extrapolation: {
				before: "hold" as const,
				after: "hold" as const,
			},
		},
		[channelIdY]: {
			kind: "scalar" as const,
			keys: keysY,
			extrapolation: {
				before: "hold" as const,
				after: "hold" as const,
			},
		},
	};

	return {
		bindings: nextBindings,
		channels: nextChannels,
	};
}

/**
 * Injects smoothed X panning keyframes onto the element's animation channel.
 */
export function computeAutoReframeKeyframes({
	durationTicks,
	samples,
	options = {},
	existingAnimations,
}: {
	durationTicks: number;
	samples?: FocalSample[];
	options?: AutoReframeOptions;
	existingAnimations?: ElementAnimations;
}): {
	animations: ElementAnimations;
	scale: number;
	targetCanvasSize: { width: number; height: number };
	keyframes: ReframeKeyframe[];
} {
	const sourceWidth = options.sourceWidth ?? 1920;
	const sourceHeight = options.sourceHeight ?? 1080;
	const targetWidth = options.targetWidth ?? 1080;
	const targetHeight = options.targetHeight ?? 1920;
	const preset = options.preset ?? "standard";

	const scale = calculateScaleToFill({
		sourceWidth,
		sourceHeight,
		targetWidth,
		targetHeight,
	});

	const maxPan = calculateMaxPanMargin({
		sourceWidth,
		scale,
		targetWidth,
	});

	// Use provided samples or default center trajectory
	const rawSamples =
		samples && samples.length > 0
			? samples
			: generateFocalSamples({
					durationTicks,
					intervalTicks: options.sampleIntervalTicks ?? TICKS_PER_SECOND / 2,
				});

	const smoothed = smoothFocalTrajectory({ samples: rawSamples, preset });

	const keyframes: ReframeKeyframe[] = smoothed.map((point) => {
		// Focal point -1.0 pans camera left (clip moves right: positive position.x)
		// Focal point +1.0 pans camera right (clip moves left: negative position.x)
		const panX = -point.focalX * maxPan;
		return {
			time: point.timeTicks,
			position: { x: Math.round(panX), y: 0 },
		};
	});

	const animations = createReframeAnimations({
		keyframes,
		existingAnimations,
	});

	return {
		animations,
		scale,
		targetCanvasSize: { width: targetWidth, height: targetHeight },
		keyframes,
	};
}
