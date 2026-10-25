import type { TranscriptionSegment } from "./types";
import type { SilenceIntervalWithTicks } from "@/lib/timeline/silence-cut";
import { generateUUID } from "@/utils/id";

const TICKS_PER_SECOND = 120_000;

export interface TranscriptWordToken {
	id: string;
	word: string;
	cleanWord: string;
	start: number;
	end: number;
	isFiller: boolean;
	segmentIndex: number;
}

export type TranscriptWord = TranscriptWordToken;

export const FILLER_WORDS = new Set([
	"um",
	"uh",
	"umm",
	"uhh",
	"er",
	"err",
	"ah",
	"ahh",
	"like",
	"hmm",
]);

export function cleanWordString(rawWord: string): string {
	return rawWord.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");
}

export function parseTranscriptWords({
	segments,
}: {
	segments: TranscriptionSegment[];
}): TranscriptWordToken[] {
	if (!segments || segments.length === 0) return [];

	const tokens: TranscriptWordToken[] = [];

	segments.forEach((segment, segIdx) => {
		const rawWords = segment.text.trim().split(/\s+/).filter(Boolean);
		if (rawWords.length === 0) return;

		const totalDuration = Math.max(0.01, segment.end - segment.start);
		const perWordDuration = totalDuration / rawWords.length;

		rawWords.forEach((rawWord, wordIdx) => {
			const clean = cleanWordString(rawWord);
			const start = segment.start + wordIdx * perWordDuration;
			const end = start + perWordDuration;
			const isFiller = FILLER_WORDS.has(clean);

			tokens.push({
				id: generateUUID(),
				word: rawWord,
				cleanWord: clean,
				start: Math.round(start * 1000) / 1000,
				end: Math.round(end * 1000) / 1000,
				isFiller,
				segmentIndex: segIdx,
			});
		});
	});

	return tokens;
}

export function detectFillerWords({
	words,
}: {
	words: TranscriptWordToken[];
}): TranscriptWordToken[] {
	return words.filter((w) => w.isFiller);
}

export function convertWordsToSilenceCuts({
	wordsToDelete,
	paddingSeconds = 0.05,
}: {
	wordsToDelete: TranscriptWordToken[];
	paddingSeconds?: number;
}): SilenceIntervalWithTicks[] {
	if (!wordsToDelete || wordsToDelete.length === 0) return [];

	// Sort chronologically
	const sorted = [...wordsToDelete].sort((a, b) => a.start - b.start);

	// Merge contiguous/overlapping words
	const mergedIntervals: Array<{ start: number; end: number }> = [];
	let current = { start: sorted[0].start, end: sorted[0].end };

	for (let i = 1; i < sorted.length; i++) {
		const next = sorted[i];
		if (next.start <= current.end + 0.1) {
			current.end = Math.max(current.end, next.end);
		} else {
			mergedIntervals.push(current);
			current = { start: next.start, end: next.end };
		}
	}
	mergedIntervals.push(current);

	// Apply inward padding to protect neighboring spoken audio
	return mergedIntervals.map((interval) => {
		const paddedStart = Math.min(
			interval.end - 0.01,
			interval.start + paddingSeconds,
		);
		const paddedEnd = Math.max(
			paddedStart + 0.01,
			interval.end - paddingSeconds,
		);

		const startTicks = Math.round(paddedStart * TICKS_PER_SECOND);
		const endTicks = Math.round(paddedEnd * TICKS_PER_SECOND);
		const durationTicks = Math.max(1, endTicks - startTicks);

		return {
			startSeconds: paddedStart,
			endSeconds: paddedEnd,
			startTicks,
			endTicks,
			durationTicks,
		};
	});
}
