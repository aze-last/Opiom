import { create } from "zustand";
import type { TranscriptionSegment } from "@/lib/transcription/types";

interface TranscriptEditorStore {
	segments: TranscriptionSegment[];
	activeMode: "captions" | "editor";
	selectedWordIds: string[];
	setSegments: (segments: TranscriptionSegment[]) => void;
	setActiveMode: (mode: "captions" | "editor") => void;
	toggleSelectWord: (wordId: string, isMulti?: boolean) => void;
	clearSelectedWords: () => void;
	selectAllFillerWords: (fillerWordIds: string[]) => void;
}

export const useTranscriptEditorStore = create<TranscriptEditorStore>(
	(set) => ({
		segments: [],
		activeMode: "captions",
		selectedWordIds: [],
		setSegments: (segments) => set({ segments, selectedWordIds: [] }),
		setActiveMode: (mode) => set({ activeMode: mode }),
		toggleSelectWord: (wordId, isMulti = false) =>
			set((state) => {
				if (!isMulti) {
					return {
						selectedWordIds: state.selectedWordIds.includes(wordId)
							? []
							: [wordId],
					};
				}
				const exists = state.selectedWordIds.includes(wordId);
				return {
					selectedWordIds: exists
						? state.selectedWordIds.filter((id) => id !== wordId)
						: [...state.selectedWordIds, wordId],
				};
			}),
		clearSelectedWords: () => set({ selectedWordIds: [] }),
		selectAllFillerWords: (fillerWordIds) =>
			set({ selectedWordIds: fillerWordIds }),
	}),
);
