import { describe, expect, it } from "bun:test";
const TICKS_PER_SECOND = 120_000;
import {
	computeSilenceCuts,
	type SilenceIntervalWithTicks,
} from "../silence-cut";
import type { VideoElement } from "@/lib/timeline";

describe("computeSilenceCuts", () => {
	it("splits an element and ripples subsequent audio/video when silence is removed", () => {
		const initialElement: VideoElement = {
			id: "elem-1",
			type: "video",
			mediaId: "media-1",
			name: "Test Clip",
			startTime: 0,
			duration: 10 * TICKS_PER_SECOND,
			trimStart: 0,
			trimEnd: 0,
			opacity: 1,
			volume: 1,
			muted: false,
			transform: {
				position: { x: 0, y: 0 },
				scale: { x: 1, y: 1 },
				rotation: 0,
			},
		};

		const intervals: SilenceIntervalWithTicks[] = [
			{
				startSeconds: 2.0,
				endSeconds: 4.0,
				startTicks: 2 * TICKS_PER_SECOND,
				endTicks: 4 * TICKS_PER_SECOND,
				durationTicks: 2 * TICKS_PER_SECOND,
			},
		];

		const resultElements = computeSilenceCuts({
			elements: [initialElement],
			intervals,
		});

		// Should produce 2 pieces:
		// Piece 1: 0s to 2s (duration 2s)
		// Piece 2: 2s to 8s (duration 6s, original 4s-10s shifted left by 2s)
		expect(resultElements.length).toBe(2);
		expect(resultElements[0].startTime).toBe(0);
		expect(resultElements[0].duration).toBe(2 * TICKS_PER_SECOND);
		expect(resultElements[1].startTime).toBe(2 * TICKS_PER_SECOND);
		expect(resultElements[1].duration).toBe(6 * TICKS_PER_SECOND);
	});

	it("handles multiple silence intervals in sequence without corrupting remaining slices", () => {
		const initialElement: VideoElement = {
			id: "elem-1",
			type: "video",
			mediaId: "media-1",
			name: "Test Clip",
			startTime: 0,
			duration: 10 * TICKS_PER_SECOND,
			trimStart: 0,
			trimEnd: 0,
			opacity: 1,
			volume: 1,
			muted: false,
			transform: {
				position: { x: 0, y: 0 },
				scale: { x: 1, y: 1 },
				rotation: 0,
			},
		};

		// Two silences: [2s - 3s] and [6s - 7s]
		const intervals: SilenceIntervalWithTicks[] = [
			{
				startSeconds: 2.0,
				endSeconds: 3.0,
				startTicks: 2 * TICKS_PER_SECOND,
				endTicks: 3 * TICKS_PER_SECOND,
				durationTicks: 1 * TICKS_PER_SECOND,
			},
			{
				startSeconds: 6.0,
				endSeconds: 7.0,
				startTicks: 6 * TICKS_PER_SECOND,
				endTicks: 7 * TICKS_PER_SECOND,
				durationTicks: 1 * TICKS_PER_SECOND,
			},
		];

		const resultElements = computeSilenceCuts({
			elements: [initialElement],
			intervals,
		});

		// 3 pieces total:
		// Piece 1: 0s - 2s (2s)
		// Piece 2: 2s - 5s (3s) -> (originally 3s - 6s, shifted left by 1s)
		// Piece 3: 5s - 8s (3s) -> (originally 7s - 10s, shifted left by 2s)
		expect(resultElements.length).toBe(3);
		expect(resultElements[0].startTime).toBe(0);
		expect(resultElements[0].duration).toBe(2 * TICKS_PER_SECOND);
		expect(resultElements[1].startTime).toBe(2 * TICKS_PER_SECOND);
		expect(resultElements[1].duration).toBe(3 * TICKS_PER_SECOND);
		expect(resultElements[2].startTime).toBe(5 * TICKS_PER_SECOND);
		expect(resultElements[2].duration).toBe(3 * TICKS_PER_SECOND);
	});
});
