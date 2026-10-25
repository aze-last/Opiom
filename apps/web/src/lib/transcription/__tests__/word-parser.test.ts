import { describe, expect, it } from "bun:test";
import {
	parseTranscriptWords,
	detectFillerWords,
	convertWordsToSilenceCuts,
} from "../word-parser";
import type { TranscriptionSegment } from "../types";

describe("word-parser for text-based video editing", () => {
	const sampleSegments: TranscriptionSegment[] = [
		{
			text: "Hello everyone um welcome to our show.",
			start: 1.0,
			end: 4.0,
		},
		{
			text: "Uh today we will build an open source editor.",
			start: 5.0,
			end: 9.0,
		},
	];

	it("splits transcript segments into timed word tokens", () => {
		const words = parseTranscriptWords({ segments: sampleSegments });
		expect(words.length).toBe(16);
		expect(words[0].word).toBe("Hello");
		expect(words[0].start).toBeCloseTo(1.0, 1);
		expect(words[words.length - 1].word).toBe("editor.");
		expect(words[words.length - 1].end).toBeCloseTo(9.0, 1);
	});

	it("flags conversational filler words accurately", () => {
		const words = parseTranscriptWords({ segments: sampleSegments });
		const fillers = detectFillerWords({ words });

		expect(fillers.length).toBe(2);
		expect(fillers[0].word.toLowerCase()).toBe("um");
		expect(fillers[1].word.toLowerCase()).toBe("uh");
	});

	it("converts deleted words into timeline silence cut intervals with ticks", () => {
		const words = parseTranscriptWords({ segments: sampleSegments });
		const fillers = detectFillerWords({ words });

		const cuts = convertWordsToSilenceCuts({
			wordsToDelete: fillers,
			paddingSeconds: 0.05,
		});

		expect(cuts.length).toBe(2);
		// Each cut interval has valid startTicks, endTicks, durationTicks > 0
		for (const cut of cuts) {
			expect(cut.endTicks).toBeGreaterThan(cut.startTicks);
			expect(cut.durationTicks).toBe(cut.endTicks - cut.startTicks);
		}
	});
});
