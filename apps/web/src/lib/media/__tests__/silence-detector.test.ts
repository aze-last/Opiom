import { describe, expect, it } from "bun:test";
import {
	detectSilenceIntervals,
	type SilenceDetectionOptions,
} from "../silence-detector";

describe("detectSilenceIntervals", () => {
	it("detects silence in the middle of speech with standard threshold and duration", () => {
		const sampleRate = 16000;
		// 3 seconds of audio:
		// 0.0s - 1.0s: speech (amplitude 0.5)
		// 1.0s - 2.0s: silence (amplitude 0.001, approx -60dB)
		// 2.0s - 3.0s: speech (amplitude 0.5)
		const totalSamples = sampleRate * 3;
		const samples = new Float32Array(totalSamples);

		// Speech section 1
		for (let i = 0; i < sampleRate * 1.0; i++) {
			samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
		}
		// Silence section (1.0s to 2.0s): leave near 0.0001
		for (let i = sampleRate * 1.0; i < sampleRate * 2.0; i++) {
			samples[i] = 0.0001;
		}
		// Speech section 2
		for (let i = sampleRate * 2.0; i < totalSamples; i++) {
			samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
		}

		const options: SilenceDetectionOptions = {
			sampleRate,
			thresholdDb: -35,
			minDurationSeconds: 0.5,
			paddingSeconds: 0.1,
		};

		const intervals = detectSilenceIntervals({ samples, options });

		expect(intervals.length).toBe(1);
		// Without padding: 1.0s to 2.0s (duration 1.0s).
		// With 0.1s padding at both ends: 1.1s to 1.9s (duration 0.8s).
		expect(intervals[0].start).toBeCloseTo(1.1, 1);
		expect(intervals[0].end).toBeCloseTo(1.9, 1);
		expect(intervals[0].duration).toBeCloseTo(0.8, 1);
	});

	it("ignores short pauses below minDurationSeconds", () => {
		const sampleRate = 16000;
		// 2 seconds: pause is only 0.2s long (from 1.0s to 1.2s)
		const totalSamples = sampleRate * 2;
		const samples = new Float32Array(totalSamples).fill(0.5);

		for (let i = sampleRate * 1.0; i < sampleRate * 1.2; i++) {
			samples[i] = 0;
		}

		const options: SilenceDetectionOptions = {
			sampleRate,
			thresholdDb: -35,
			minDurationSeconds: 0.5, // 0.5s required, but gap is 0.2s
			paddingSeconds: 0.0,
		};

		const intervals = detectSilenceIntervals({ samples, options });
		expect(intervals.length).toBe(0);
	});

	it("returns empty array for completely loud audio", () => {
		const samples = new Float32Array(16000).fill(0.8);
		const intervals = detectSilenceIntervals({
			samples,
			options: {
				sampleRate: 16000,
				thresholdDb: -35,
				minDurationSeconds: 0.3,
				paddingSeconds: 0.05,
			},
		});
		expect(intervals.length).toBe(0);
	});

	it("detects entire track as silence if audio is completely flat", () => {
		const sampleRate = 16000;
		const samples = new Float32Array(sampleRate * 2).fill(0.0);
		const intervals = detectSilenceIntervals({
			samples,
			options: {
				sampleRate,
				thresholdDb: -40,
				minDurationSeconds: 0.5,
				paddingSeconds: 0.0,
			},
		});

		expect(intervals.length).toBe(1);
		expect(intervals[0].start).toBeCloseTo(0.0, 1);
		expect(intervals[0].end).toBeCloseTo(2.0, 1);
	});
});
