import type { TimelineElement } from "@/lib/timeline/types";
import { generateUUID } from "@/utils/id";

export interface SilenceIntervalWithTicks {
	startSeconds: number;
	endSeconds: number;
	startTicks: number;
	endTicks: number;
	durationTicks: number;
}

export function computeSilenceCuts<TElement extends TimelineElement>({
	elements,
	intervals,
}: {
	elements: TElement[];
	intervals: SilenceIntervalWithTicks[];
}): TElement[] {
	if (elements.length === 0 || intervals.length === 0) {
		return elements;
	}

	// Sort intervals from latest to earliest so right-to-left cuts
	// preserve start ticks for preceding intervals.
	const sortedIntervals = [...intervals].sort(
		(a, b) => b.startTicks - a.startTicks,
	);

	let currentElements = [...elements];

	for (const interval of sortedIntervals) {
		const { startTicks, endTicks, durationTicks } = interval;
		if (durationTicks <= 0) continue;

		const nextElements: TElement[] = [];

		for (const element of currentElements) {
			const elemStart = element.startTime;
			const elemEnd = elemStart + element.duration;

			// Case 1: Element completely before silence interval
			if (elemEnd <= startTicks) {
				nextElements.push(element);
				continue;
			}

			// Case 2: Element completely after silence interval -> shift left by ripple amount
			if (elemStart >= endTicks) {
				nextElements.push({
					...element,
					startTime: elemStart - durationTicks,
				} as TElement);
				continue;
			}

			// Case 3: Element completely inside silence interval -> dropped (deleted)
			if (elemStart >= startTicks && elemEnd <= endTicks) {
				continue;
			}

			// Case 4: Element spans across the silence interval (splits into left and/or right pieces)
			// Left piece (from elemStart to startTicks)
			if (elemStart < startTicks) {
				const leftDuration = startTicks - elemStart;
				const leftPiece = {
					...element,
					id: generateUUID(),
					duration: leftDuration,
				} as TElement;
				nextElements.push(leftPiece);
			}

			// Right piece (from endTicks to elemEnd, shifted left to startTicks)
			if (elemEnd > endTicks) {
				const cutElapsed = endTicks - elemStart;
				const rightDuration = elemEnd - endTicks;
				const hasTrimStart =
					"trimStart" in element && typeof element.trimStart === "number";

				const rightPiece = {
					...element,
					id: generateUUID(),
					startTime: startTicks, // shifted left by (endTicks - startTicks)
					duration: rightDuration,
					...(hasTrimStart
						? {
								trimStart:
									(element as unknown as { trimStart: number }).trimStart +
									cutElapsed,
							}
						: {}),
				} as TElement;
				nextElements.push(rightPiece);
			}
		}

		currentElements = nextElements;
	}

	// Sort final elements chronologically by startTime
	return currentElements.sort((a, b) => a.startTime - b.startTime);
}
