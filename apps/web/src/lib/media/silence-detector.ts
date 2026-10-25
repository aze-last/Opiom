/**
 * Smart Silence Detection Engine
 * Computes dead-air silence intervals based on RMS amplitude energy,
 * duration thresholds, and customizable padding buffers.
 */

export interface SilenceDetectionOptions {
	/**
	 * Sample rate of the provided Float32Array (e.g. 16000 or 44100).
	 */
	sampleRate: number;
	/**
	 * Decibel cutoff threshold (e.g. -35 dB).
	 * Signals below this level are classified as silence.
	 */
	thresholdDb?: number;
	/**
	 * Minimum gap duration in seconds before an interval is counted as silence.
	 * Default: 0.5 seconds.
	 */
	minDurationSeconds?: number;
	/**
	 * Safety buffer in seconds left on both ends of the speech boundary
	 * to prevent clipping consonants or breathing.
	 * Default: 0.1 seconds (100ms).
	 */
	paddingSeconds?: number;
	/**
	 * Window size in milliseconds for RMS analysis.
	 * Default: 20ms.
	 */
	windowMs?: number;
}

export interface SilenceInterval {
	start: number;
	end: number;
	duration: number;
}

export const DEFAULT_SILENCE_THRESHOLD_DB = -35;
export const DEFAULT_MIN_SILENCE_DURATION_S = 0.5;
export const DEFAULT_SILENCE_PADDING_S = 0.1;

export function detectSilenceIntervals({
	samples,
	options,
}: {
	samples: Float32Array;
	options: SilenceDetectionOptions;
}): SilenceInterval[] {
	const sampleRate = options.sampleRate;
	if (!samples || samples.length === 0 || sampleRate <= 0) {
		return [];
	}

	const thresholdDb = options.thresholdDb ?? DEFAULT_SILENCE_THRESHOLD_DB;
	const minDuration =
		options.minDurationSeconds ?? DEFAULT_MIN_SILENCE_DURATION_S;
	const padding = options.paddingSeconds ?? DEFAULT_SILENCE_PADDING_S;
	const windowMs = options.windowMs ?? 20;

	// Convert dB threshold to linear amplitude: amplitude = 10^(dB / 20)
	const linearThreshold = 10 ** (thresholdDb / 20);

	const windowSamples = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
	const numWindows = Math.floor(samples.length / windowSamples);

	const isSilentWindow = new Uint8Array(numWindows);

	for (let w = 0; w < numWindows; w++) {
		const offset = w * windowSamples;
		let sumSquares = 0;
		for (let i = 0; i < windowSamples; i++) {
			const s = samples[offset + i];
			sumSquares += s * s;
		}
		const rms = Math.sqrt(sumSquares / windowSamples);
		if (rms < linearThreshold) {
			isSilentWindow[w] = 1;
		}
	}

	// Group contiguous silent windows into intervals
	const rawIntervals: Array<{ start: number; end: number }> = [];
	let inSilence = false;
	let silenceStart = 0;

	const windowDurationSeconds = windowSamples / sampleRate;

	for (let w = 0; w < numWindows; w++) {
		if (isSilentWindow[w] === 1) {
			if (!inSilence) {
				inSilence = true;
				silenceStart = w * windowDurationSeconds;
			}
		} else {
			if (inSilence) {
				inSilence = false;
				const silenceEnd = w * windowDurationSeconds;
				rawIntervals.push({ start: silenceStart, end: silenceEnd });
			}
		}
	}

	// If audio ended during a silence
	if (inSilence) {
		const totalDuration = samples.length / sampleRate;
		rawIntervals.push({ start: silenceStart, end: totalDuration });
	}

	// Filter and apply inward padding to protect speech boundaries
	const intervals: SilenceInterval[] = [];

	for (const raw of rawIntervals) {
		const rawDuration = raw.end - raw.start;
		if (rawDuration < minDuration) {
			continue;
		}

		// Shrink silence by padding inward
		const adjustedStart = raw.start + padding;
		const adjustedEnd = raw.end - padding;

		if (adjustedEnd > adjustedStart) {
			intervals.push({
				start: Math.round(adjustedStart * 1000) / 1000,
				end: Math.round(adjustedEnd * 1000) / 1000,
				duration: Math.round((adjustedEnd - adjustedStart) * 1000) / 1000,
			});
		}
	}

	return intervals;
}
