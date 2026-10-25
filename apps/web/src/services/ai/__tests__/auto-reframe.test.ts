import { describe, expect, it } from "bun:test";
import {
	calculateScaleToFill,
	calculateMaxPanMargin,
	smoothFocalTrajectory,
	generateFocalSamples,
	computeAutoReframeKeyframes,
	type FocalSample,
} from "../auto-reframe";

const TICKS_PER_SECOND = 120_000;

describe("auto-reframe algorithm & keyframe generation", () => {
	it("calculates exact uniform scale to fill 9:16 target from 16:9 source", () => {
		const scale = calculateScaleToFill({
			sourceWidth: 1920,
			sourceHeight: 1080,
			targetWidth: 1080,
			targetHeight: 1920,
		});

		// 1920 / 1080 = 1.777777...
		expect(scale).toBeCloseTo(1.7778, 3);
	});

	it("calculates horizontal pan margins accurately after scaling", () => {
		const scale = calculateScaleToFill({
			sourceWidth: 1920,
			sourceHeight: 1080,
			targetWidth: 1080,
			targetHeight: 1920,
		});

		const maxPan = calculateMaxPanMargin({
			sourceWidth: 1920,
			scale,
			targetWidth: 1080,
		});

		// (1920 * (1920/1080) - 1080) / 2 = (3413.33 - 1080) / 2 = 1166.67
		expect(maxPan).toBeCloseTo(1166.67, 1);
	});

	it("filters out micro-jitter within deadband threshold", () => {
		const jitterSamples: FocalSample[] = [
			{ timeTicks: 0, focalX: 0.0 },
			{ timeTicks: 10_000, focalX: 0.03 }, // Within 0.08 deadband
			{ timeTicks: 20_000, focalX: -0.04 }, // Within deadband
			{ timeTicks: 30_000, focalX: 0.02 }, // Within deadband
		];

		const smoothed = smoothFocalTrajectory({
			samples: jitterSamples,
			preset: "standard",
		});

		// All micro-jitters are filtered, remaining at steady 0.0
		expect(smoothed[0].focalX).toBe(0.0);
		expect(smoothed[1].focalX).toBe(0.0);
		expect(smoothed[2].focalX).toBe(0.0);
		expect(smoothed[3].focalX).toBe(0.0);
	});

	it("smooths large camera motion using EMA damping", () => {
		const shiftSamples: FocalSample[] = [
			{ timeTicks: 0, focalX: 0.0 },
			{ timeTicks: 60_000, focalX: 0.8 }, // Sudden subject move to right
			{ timeTicks: 120_000, focalX: 0.8 },
		];

		const smoothed = smoothFocalTrajectory({
			samples: shiftSamples,
			preset: "standard", // alpha = 0.2
		});

		// First step should ease into the transition (0 + 0.2 * 0.8 = 0.16)
		expect(smoothed[1].focalX).toBeCloseTo(0.16, 2);
		// Second step continues easing (0.16 + 0.2 * (0.8 - 0.16) = 0.288)
		expect(smoothed[2].focalX).toBeCloseTo(0.288, 2);
	});

	it("computes keyframes and outputs vertical canvas dimensions", () => {
		const durationTicks = 5 * TICKS_PER_SECOND; // 5 seconds
		const samples: FocalSample[] = [
			{ timeTicks: 0, focalX: 0.0 },
			{ timeTicks: 2 * TICKS_PER_SECOND, focalX: 0.5 },
			{ timeTicks: 4 * TICKS_PER_SECOND, focalX: -0.5 },
		];

		const result = computeAutoReframeKeyframes({
			durationTicks,
			samples,
			options: {
				preset: "action",
				sourceWidth: 1920,
				sourceHeight: 1080,
				targetWidth: 1080,
				targetHeight: 1920,
			},
		});

		expect(result.targetCanvasSize).toEqual({ width: 1080, height: 1920 });
		expect(result.scale).toBeCloseTo(1.7778, 3);
		expect(result.animations).toBeDefined();
		expect(result.animations?.bindings["transform.positionX"]).toBeDefined();
		expect(result.animations?.bindings["transform.positionY"]).toBeDefined();
	});

	it("generates synthetic focal trajectory samples over duration", () => {
		const samples = generateFocalSamples({
			durationTicks: TICKS_PER_SECOND * 2,
			intervalTicks: TICKS_PER_SECOND,
			initialCenter: 0.25,
		});
		expect(samples.length).toBeGreaterThanOrEqual(3);
		expect(samples[0].focalX).toBe(0.25);
	});
});
