import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AiProviderPreset =
	| "openai"
	| "ollama"
	| "openrouter"
	| "deepseek"
	| "groq"
	| "custom";

export interface ProviderPresetConfig {
	name: string;
	defaultBaseUrl: string;
	defaultModel: string;
	description: string;
	requiresKey: boolean;
}

export const PROVIDER_PRESETS: Record<AiProviderPreset, ProviderPresetConfig> =
	{
		openai: {
			name: "OpenAI",
			defaultBaseUrl: "https://api.openai.com/v1",
			defaultModel: "gpt-4o",
			description: "Standard OpenAI endpoint for GPT-4o, GPT-4o-mini, etc.",
			requiresKey: true,
		},
		ollama: {
			name: "Ollama (Local)",
			defaultBaseUrl: "http://localhost:11434/v1",
			defaultModel: "llama3.2",
			description:
				"Local inference running on your machine with 0 external network requests.",
			requiresKey: false,
		},
		openrouter: {
			name: "OpenRouter",
			defaultBaseUrl: "https://openrouter.ai/api/v1",
			defaultModel: "openai/gpt-4o-mini",
			description:
				"Multi-model unified gateway for Claude, Llama, Mistral, and more.",
			requiresKey: true,
		},
		deepseek: {
			name: "DeepSeek",
			defaultBaseUrl: "https://api.deepseek.com/v1",
			defaultModel: "deepseek-chat",
			description: "High-performance DeepSeek V3 / R1 reasoning endpoint.",
			requiresKey: true,
		},
		groq: {
			name: "Groq (Ultra-Fast)",
			defaultBaseUrl: "https://api.groq.com/openai/v1",
			defaultModel: "llama-3.3-70b-versatile",
			description:
				"Ultra-low latency LPU engine for fast transcript processing.",
			requiresKey: true,
		},
		custom: {
			name: "Custom OpenAI-Compatible",
			defaultBaseUrl: "https://api.openai.com/v1",
			defaultModel: "gpt-4o",
			description:
				"Any vLLM, LM Studio, FastChat, or custom OpenAI-compatible server.",
			requiresKey: true,
		},
	};

export interface AiProviderState {
	preset: AiProviderPreset;
	baseUrl: string;
	apiKey: string;
	model: string;
	temperature: number;
	maxTokens: number;

	// Actions
	setPreset: (preset: AiProviderPreset) => void;
	setBaseUrl: (baseUrl: string) => void;
	setApiKey: (apiKey: string) => void;
	setModel: (model: string) => void;
	setTemperature: (temperature: number) => void;
	setMaxTokens: (maxTokens: number) => void;
	resetToDefaults: () => void;
}

const DEFAULT_CONFIG = {
	preset: "openai" as AiProviderPreset,
	baseUrl: PROVIDER_PRESETS.openai.defaultBaseUrl,
	apiKey: "",
	model: PROVIDER_PRESETS.openai.defaultModel,
	temperature: 0.7,
	maxTokens: 2048,
};

export const useAiProviderStore = create<AiProviderState>()(
	persist(
		(set) => ({
			...DEFAULT_CONFIG,

			setPreset: (preset: AiProviderPreset) =>
				set(() => {
					const config = PROVIDER_PRESETS[preset];
					return {
						preset,
						baseUrl: config.defaultBaseUrl,
						model: config.defaultModel,
					};
				}),

			setBaseUrl: (baseUrl: string) => set({ baseUrl: baseUrl.trim() }),
			setApiKey: (apiKey: string) => set({ apiKey: apiKey.trim() }),
			setModel: (model: string) => set({ model: model.trim() }),
			setTemperature: (temperature: number) => set({ temperature }),
			setMaxTokens: (maxTokens: number) => set({ maxTokens }),
			resetToDefaults: () => set(DEFAULT_CONFIG),
		}),
		{
			name: "opencut_ai_provider_config",
		},
	),
);
