"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import {
	useAiProviderStore,
	PROVIDER_PRESETS,
	type AiProviderPreset,
} from "@/stores/ai-provider-store";
import {
	testLlmConnection,
	fetchAvailableModels,
	type LlmConnectionTestResult,
} from "@/services/ai/clipper-service";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	AiBrain05Icon,
	CheckmarkCircle02Icon,
	AlertCircleIcon,
	RotateClockwiseIcon,
	SparklesIcon,
	Globe02Icon,
	Key01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

interface AiProviderSettingsProps {
	className?: string;
	compact?: boolean;
}

export function AiProviderSettings({
	className,
	compact = false,
}: AiProviderSettingsProps) {
	const {
		preset,
		baseUrl,
		apiKey,
		model,
		temperature,
		maxTokens,
		setPreset,
		setBaseUrl,
		setApiKey,
		setModel,
		setTemperature,
		setMaxTokens,
		resetToDefaults,
	} = useAiProviderStore();

	const [showApiKey, setShowApiKey] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [isFetchingModels, setIsFetchingModels] = useState(false);
	const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
	const [testResult, setTestResult] = useState<LlmConnectionTestResult | null>(
		null,
	);

	const handlePresetChange = (newPreset: AiProviderPreset) => {
		setPreset(newPreset);
		setTestResult(null);
		setDiscoveredModels([]);
		toast.info(`Switched preset to ${PROVIDER_PRESETS[newPreset].name}`);
	};

	const handleFetchModels = async () => {
		if (!baseUrl) {
			toast.error("Please provide a Base URL first");
			return;
		}

		setIsFetchingModels(true);
		const toastId = toast.loading("Discovering models from endpoint...");

		try {
			const res = await fetchAvailableModels({ baseUrl, apiKey });
			if (res.success && res.models.length > 0) {
				setDiscoveredModels(res.models);
				toast.success(`Found ${res.models.length} available models!`, {
					id: toastId,
				});
			} else {
				toast.error(res.message || "No models returned by this endpoint", {
					id: toastId,
				});
			}
		} catch {
			toast.error("Failed to query models from provider", { id: toastId });
		} finally {
			setIsFetchingModels(false);
		}
	};

	const handleTestConnection = async () => {
		setIsTesting(true);
		setTestResult(null);
		const toastId = toast.loading("Testing LLM endpoint connection...");

		try {
			const result = await testLlmConnection({
				baseUrl,
				apiKey,
				model,
			});

			setTestResult(result);
			if (result.availableModels && result.availableModels.length > 0) {
				setDiscoveredModels(result.availableModels);
			}

			if (result.success) {
				toast.success(result.message, { id: toastId });
			} else {
				toast.error(result.message, { id: toastId });
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Connection failed";
			setTestResult({
				success: false,
				latencyMs: 0,
				message,
			});
			toast.error(message, { id: toastId });
		} finally {
			setIsTesting(false);
		}
	};

	const handleSave = () => {
		toast.success("AI Provider settings saved to local browser storage!");
	};

	return (
		<div className={cn("flex flex-col gap-6", className)}>
			{/* Preset Selector */}
			<div className="space-y-2">
				<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
					Provider Presets
				</span>
				<div
					className={cn(
						"grid gap-2",
						compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
					)}
				>
					{(Object.keys(PROVIDER_PRESETS) as AiProviderPreset[]).map((key) => {
						const config = PROVIDER_PRESETS[key];
						const isSelected = preset === key;
						return (
							<button
								key={key}
								type="button"
								onClick={() => handlePresetChange(key)}
								className={cn(
									"p-3 rounded-lg border text-left transition-all relative overflow-hidden",
									isSelected
										? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
										: "border-border/60 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground",
								)}
							>
								<div className="flex items-center justify-between mb-1">
									<span className="font-medium text-xs text-foreground block">
										{config.name}
									</span>
									{isSelected && (
										<HugeiconsIcon
											icon={CheckmarkCircle02Icon}
											className="size-3.5 text-primary shrink-0"
										/>
									)}
								</div>
								<p className="text-[10px] text-muted-foreground line-clamp-1">
									{config.defaultModel}
								</p>
							</button>
						);
					})}
				</div>
			</div>

			{/* Configuration Inputs */}
			<div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-foreground flex items-center gap-1.5">
							<HugeiconsIcon
								icon={Globe02Icon}
								className="size-3.5 text-muted-foreground"
							/>
							<span>Base URL (API Endpoint)</span>
						</span>
						<button
							type="button"
							onClick={() =>
								setBaseUrl(PROVIDER_PRESETS[preset].defaultBaseUrl)
							}
							className="text-[10px] text-muted-foreground hover:text-foreground underline"
						>
							Reset default
						</button>
					</div>
					<Input
						value={baseUrl}
						onChange={(e) => {
							setBaseUrl(e.target.value);
							setTestResult(null);
						}}
						aria-label="Base URL"
						placeholder="https://api.openai.com/v1"
						className="text-xs font-mono"
					/>
					<p className="text-[10px] text-muted-foreground">
						Supports any OpenAI-compatible endpoint (OpenAI, Ollama, DeepSeek,
						OpenRouter, vLLM, LM Studio).
					</p>
				</div>

				<div className="space-y-1.5">
					<span className="text-xs font-medium text-foreground flex items-center gap-1.5">
						<HugeiconsIcon
							icon={Key01Icon}
							className="size-3.5 text-muted-foreground"
						/>
						<span>API Key / Secret Token</span>
					</span>
					<Input
						type="password"
						showPassword={showApiKey}
						onShowPasswordChange={setShowApiKey}
						value={apiKey}
						onChange={(e) => {
							setApiKey(e.target.value);
							setTestResult(null);
						}}
						aria-label="API Key / Secret Token"
						placeholder={
							preset === "ollama" ? "Not required for local Ollama" : "sk-..."
						}
						className="text-xs font-mono"
					/>
					<p className="text-[10px] text-muted-foreground">
						Stored strictly in client-side localStorage. Never sent to OpenCut
						or any intermediary proxy.
					</p>
				</div>

				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-foreground flex items-center gap-1.5">
							<HugeiconsIcon
								icon={AiBrain05Icon}
								className="size-3.5 text-muted-foreground"
							/>
							<span>Model Identifier</span>
						</span>
						<button
							type="button"
							onClick={handleFetchModels}
							disabled={isFetchingModels}
							className="text-[10px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
						>
							{isFetchingModels ? <Spinner className="size-2.5" /> : null}
							<span>Auto-fetch models</span>
						</button>
					</div>
					<Input
						value={model}
						onChange={(e) => {
							setModel(e.target.value);
							setTestResult(null);
						}}
						aria-label="Model Identifier"
						placeholder="gpt-4o, qwen/qwen3.5-flash:free, deepseek-chat, etc."
						className="text-xs font-mono"
					/>
					{/* Discovered models quick-select chips */}
					{discoveredModels.length > 0 && (
						<div className="space-y-1 pt-1">
							<span className="text-[10px] font-medium text-muted-foreground block">
								Available models on this provider ({discoveredModels.length}):
							</span>
							<div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-muted/20 rounded border border-border/40">
								{discoveredModels.slice(0, 16).map((m) => (
									<button
										key={m}
										type="button"
										onClick={() => {
											setModel(m);
											setTestResult(null);
										}}
										className={cn(
											"text-[10px] px-2 py-0.5 rounded font-mono transition-colors",
											model === m
												? "bg-primary text-primary-foreground font-semibold"
												: "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground",
										)}
									>
										{m}
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Advanced Sliders */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
					<div className="space-y-1.5">
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium text-muted-foreground">
								Temperature
							</span>
							<span className="text-foreground font-mono">
								{temperature.toFixed(2)}
							</span>
						</div>
						<Slider
							value={[temperature]}
							min={0}
							max={1}
							step={0.05}
							onValueChange={([val]) => setTemperature(val)}
						/>
					</div>

					<div className="space-y-1.5">
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium text-muted-foreground">
								Max Tokens
							</span>
							<span className="text-foreground font-mono">{maxTokens}</span>
						</div>
						<Slider
							value={[maxTokens]}
							min={512}
							max={4096}
							step={128}
							onValueChange={([val]) => setMaxTokens(val)}
						/>
					</div>
				</div>
			</div>

			{/* Connection Status Card */}
			{testResult && (
				<div
					className={cn(
						"p-3 rounded-lg border flex flex-col gap-2 text-xs transition-all",
						testResult.success
							? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
							: "border-rose-500/40 bg-rose-500/10 text-rose-300",
					)}
				>
					<div className="flex items-start gap-2.5">
						<HugeiconsIcon
							icon={testResult.success ? CheckmarkCircle02Icon : AlertCircleIcon}
							className="size-4 shrink-0 mt-0.5"
						/>
						<div className="flex-1">
							<p className="font-medium">
								{testResult.success ? "Connection Verified" : "Connection Error"}
							</p>
							<p className="text-[11px] opacity-90 mt-0.5">
								{testResult.message}
							</p>
						</div>
					</div>

					{testResult.suggestedModel && model !== testResult.suggestedModel && (
						<div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between gap-2">
							<span className="text-[11px] text-emerald-200">
								Switch to available model:
							</span>
							<Button
								type="button"
								size="sm"
								variant="secondary"
								className="h-6 text-[10px] px-2.5 font-mono bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-500/30"
								onClick={() => {
									setModel(testResult.suggestedModel!);
									setTestResult(null);
								}}
							>
								Use {testResult.suggestedModel}
							</Button>
						</div>
					)}
				</div>
			)}

			{/* Actions Footer */}
			<div className="flex items-center justify-between gap-3 pt-1">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground"
					onClick={resetToDefaults}
				>
					<HugeiconsIcon icon={RotateClockwiseIcon} className="size-3.5" />
					<span>Reset</span>
				</Button>

				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="secondary"
						size="sm"
						className="text-xs h-9 gap-1.5 active:scale-[0.98] transition-transform"
						onClick={handleTestConnection}
						disabled={isTesting}
					>
						{isTesting ? (
							<>
								<Spinner className="size-3.5" />
								<span>Testing...</span>
							</>
						) : (
							<>
								<HugeiconsIcon
									icon={SparklesIcon}
									className="size-3.5 text-primary"
								/>
								<span>Test Connection</span>
							</>
						)}
					</Button>

					<Button
						type="button"
						variant="default"
						size="sm"
						className="text-xs h-9 font-medium px-4 active:scale-[0.98] transition-transform"
						onClick={handleSave}
					>
						Save Settings
					</Button>
				</div>
			</div>
		</div>
	);
}
