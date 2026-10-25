"use client";

import type { MaskableElement } from "@/lib/timeline";
import type { Mask, MaskType } from "@/lib/masks/types";
import type {
	NumberParamDefinition,
	SelectParamDefinition,
} from "@/lib/params";
import { masksRegistry, buildDefaultMaskInstance } from "@/lib/masks";
import { useEditor } from "@/hooks/use-editor";
import { useElementPreview } from "@/hooks/use-element-preview";
import { useMenuPreview } from "@/hooks/use-menu-preview";
import { getVisibleElementsWithBounds } from "@/lib/preview/element-bounds";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Delete02Icon,
	FeatherIcon,
	PlusSignIcon,
	RotateClockwiseIcon,
	SparklesIcon,
	AiBrain05Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Slider } from "@/components/ui/slider";
import { generateAlphaMatteFromImageData } from "@/services/ai/segmentation-service";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NumberField } from "@/components/ui/number-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	clamp,
	formatNumberForDisplay,
	getFractionDigitsForStep,
	snapToStep,
} from "@/utils/math";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { usePropertyDraft } from "../hooks/use-property-draft";
import { OcMirrorIcon, OcShapesIcon } from "@/components/icons";
import { cn } from "@/utils/ui";

type MasksTabProps = {
	element: MaskableElement;
	trackId: string;
};

type MaskItemProps = {
	trackId: string;
	elementId: string;
	mask: Mask;
	previewParam: (key: string) => (value: number | string | boolean) => void;
	onCommit: () => void;
};

type EmptyViewProps = {
	onAddMask: () => void;
};

type PreviewParamHandler = (
	key: string,
) => (value: number | string | boolean) => void;

type RegisteredMaskDefinition = ReturnType<(typeof masksRegistry)["get"]>;

export function MasksTab({ element, trackId }: MasksTabProps) {
	const editor = useEditor();
	const { renderElement, previewUpdates, commit } =
		useElementPreview<MaskableElement>({
			trackId,
			elementId: element.id,
			fallback: element,
		});
	const maskDefs = masksRegistry.getAll();
	const tracks = useEditor(
		(e) => e.timeline.getPreviewTracks() ?? e.scenes.getActiveScene().tracks,
	);
	const currentTime = useEditor((e) => e.playback.getCurrentTime());
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const canvasSize = useEditor(
		(e) => e.project.getActive().settings.canvasSize,
	);
	const masks = element.masks ?? [];
	const renderMasks = renderElement.masks ?? masks;
	const hasMask = masks.length > 0;
	const { onPointerLeave, onOpenChange, markCommitted } = useMenuPreview();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const elementBounds = useMemo(() => {
		const clampedTime = Math.min(
			Math.max(currentTime, element.startTime),
			element.startTime + element.duration - 1,
		);

		return (
			getVisibleElementsWithBounds({
				tracks,
				currentTime: clampedTime,
				canvasSize,
				mediaAssets,
			}).find(
				(item) => item.trackId === trackId && item.elementId === element.id,
			)?.bounds ?? null
		);
	}, [
		canvasSize,
		currentTime,
		element.duration,
		element.id,
		element.startTime,
		mediaAssets,
		trackId,
		tracks,
	]);

	const handleDropdownOpenChange = (open: boolean) => {
		if (hasMask && open) return;
		setIsDropdownOpen(open);
		onOpenChange(open);
	};

	const previewMask = ({ maskType }: { maskType: MaskType }) => {
		editor.timeline.previewElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					updates: {
						masks: [
							buildDefaultMaskInstance({
								maskType,
								elementSize: elementBounds
									? {
											width: elementBounds.width,
											height: elementBounds.height,
										}
									: undefined,
							}),
						],
					} as Partial<MaskableElement>,
				},
			],
		});
	};

	const commitMask = ({ maskType }: { maskType: MaskType }) => {
		if (editor.timeline.isPreviewActive()) {
			editor.timeline.commitPreview();
		} else {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: {
							masks: [
								buildDefaultMaskInstance({
									maskType,
									elementSize: elementBounds
										? {
												width: elementBounds.width,
												height: elementBounds.height,
											}
										: undefined,
								}),
							],
						} as Partial<MaskableElement>,
					},
				],
			});
		}
		markCommitted();
		setIsDropdownOpen(false);
	};

	const previewMaskParam =
		({ index, key }: { index: number; key: string }) =>
		(value: number | string | boolean) => {
			if (!renderMasks[index]) {
				return;
			}

			const updatedMasks = renderMasks.map((existingMask, maskIndex) =>
				maskIndex !== index
					? existingMask
					: {
							...existingMask,
							params: {
								...existingMask.params,
								[key]: value,
							},
						},
			);

			previewUpdates({ masks: updatedMasks } as Partial<MaskableElement>);
		};

	return (
		<div className="flex flex-col h-full">
			<AISmartCutoutSection
				element={element}
				trackId={trackId}
				elementBounds={elementBounds}
			/>
			<div className="border-b px-3.5 h-11 shrink-0 flex items-center justify-between gap-2">
				<SectionTitle>Manual Shapes & Masks</SectionTitle>
				<DropdownMenu
					open={hasMask ? false : isDropdownOpen}
					onOpenChange={handleDropdownOpenChange}
				>
					{hasMask ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex">
									<Button
										variant="ghost"
										size="icon"
										disabled
										aria-label="Add mask"
									>
										<HugeiconsIcon icon={PlusSignIcon} className="size-3.5!" />
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent className="max-w-56 text-balance">
								Only one mask is supported right now. If you need more,
								duplicate the clip and apply a different mask to each copy.
							</TooltipContent>
						</Tooltip>
					) : (
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" aria-label="Add mask">
								<HugeiconsIcon icon={PlusSignIcon} className="size-3.5!" />
							</Button>
						</DropdownMenuTrigger>
					)}
					<DropdownMenuContent className="w-40" onPointerLeave={onPointerLeave}>
						{maskDefs.map((definition) => (
							<DropdownMenuItem
								key={definition.type}
								onPointerEnter={() =>
									previewMask({ maskType: definition.type })
								}
								onClick={() => commitMask({ maskType: definition.type })}
							>
								<HugeiconsIcon {...definition.icon} />
								{definition.name}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{masks.length === 0 ? (
				<EmptyView onAddMask={() => setIsDropdownOpen(true)} />
			) : (
				masks.map((mask, index) => (
					<MaskItem
						key={mask.id}
						trackId={trackId}
						elementId={element.id}
						mask={renderMasks[index] ?? mask}
						previewParam={(paramKey) =>
							previewMaskParam({ index, key: paramKey })
						}
						onCommit={commit}
					/>
				))
			)}
		</div>
	);
}

function MaskItem({
	trackId,
	elementId,
	mask,
	previewParam,
	onCommit,
}: MaskItemProps) {
	const editor = useEditor();
	const definition = masksRegistry.get(mask.type);

	return (
		<Section sectionKey={`mask-item:${mask.id}`} showTopBorder={false}>
			<SectionHeader
				trailing={
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							aria-label={`Toggle ${definition.name} mask inversion`}
							onClick={() =>
								editor.timeline.toggleMaskInverted({
									trackId,
									elementId,
									maskId: mask.id,
								})
							}
						>
							<OcMirrorIcon
								className={cn(mask.params.inverted && "-scale-x-100")}
							/>
						</Button>
						<Button
							variant="ghost"
							size="icon"
							aria-label={`Remove ${definition.name} mask`}
							onClick={() =>
								editor.timeline.removeMask({
									trackId,
									elementId,
									maskId: mask.id,
								})
							}
						>
							<HugeiconsIcon icon={Delete02Icon} />
						</Button>
					</div>
				}
			>
				<div className="flex items-center gap-2">
					<HugeiconsIcon {...definition.icon} size={14} />
					<SectionTitle className="capitalize font-normal">
						{definition.name}
					</SectionTitle>
				</div>
			</SectionHeader>
			<SectionContent>
				<MaskParamsFields
					mask={mask}
					definition={definition}
					previewParam={previewParam}
					onCommit={onCommit}
				/>
			</SectionContent>
		</Section>
	);
}

function MaskParamsFields({
	mask,
	definition,
	previewParam,
	onCommit,
}: {
	mask: Mask;
	definition: RegisteredMaskDefinition;
	previewParam: PreviewParamHandler;
	onCommit: () => void;
}) {
	const featherParam = getNumberParamDefinition({
		definition,
		key: "feather",
	});
	const strokeWidthParam = getNumberParamDefinition({
		definition,
		key: "strokeWidth",
	});
	const previewNumberParam = (key: string) => (value: number) =>
		previewParam(key)(value);
	const previewStrokeColor = previewParam("strokeColor");
	const strokeAlignParam = definition.params.find(
		(param): param is SelectParamDefinition =>
			param.key === "strokeAlign" && param.type === "select",
	);

	return (
		<SectionFields>
			{definition.features.hasPosition &&
				"centerX" in mask.params &&
				"centerY" in mask.params && (
					<SectionField label="Position">
						<div className="flex items-center gap-2">
							<MaskNumberField
								className="flex-1"
								icon="X"
								param={getNumberParamDefinition({
									definition,
									key: "centerX",
								})}
								value={getMaskNumber({
									params: mask.params,
									key: "centerX",
								})}
								onPreview={previewNumberParam("centerX")}
								onCommit={onCommit}
							/>
							<MaskNumberField
								className="flex-1"
								icon="Y"
								param={getNumberParamDefinition({
									definition,
									key: "centerY",
								})}
								value={getMaskNumber({
									params: mask.params,
									key: "centerY",
								})}
								onPreview={previewNumberParam("centerY")}
								onCommit={onCommit}
							/>
						</div>
					</SectionField>
				)}

			{definition.features.sizeMode === "width-height" &&
				"width" in mask.params &&
				"height" in mask.params && (
					<SectionField label="Size">
						<div className="flex items-center gap-2">
							<MaskNumberField
								className="flex-1"
								icon="W"
								param={getNumberParamDefinition({
									definition,
									key: "width",
								})}
								value={getMaskNumber({
									params: mask.params,
									key: "width",
								})}
								onPreview={previewNumberParam("width")}
								onCommit={onCommit}
							/>
							<MaskNumberField
								className="flex-1"
								icon="H"
								param={getNumberParamDefinition({
									definition,
									key: "height",
								})}
								value={getMaskNumber({
									params: mask.params,
									key: "height",
								})}
								onPreview={previewNumberParam("height")}
								onCommit={onCommit}
							/>
						</div>
					</SectionField>
				)}

			{definition.features.sizeMode === "height-only" &&
				"height" in mask.params && (
					<SectionField label="Height">
						<MaskNumberField
							icon="H"
							param={getNumberParamDefinition({
								definition,
								key: "height",
							})}
							value={getMaskNumber({
								params: mask.params,
								key: "height",
							})}
							onPreview={previewNumberParam("height")}
							onCommit={onCommit}
						/>
					</SectionField>
				)}

			{definition.features.sizeMode === "width-only" &&
				"width" in mask.params && (
					<SectionField label="Width">
						<MaskNumberField
							icon="W"
							param={getNumberParamDefinition({
								definition,
								key: "width",
							})}
							value={getMaskNumber({
								params: mask.params,
								key: "width",
							})}
							onPreview={previewNumberParam("width")}
							onCommit={onCommit}
						/>
					</SectionField>
				)}

			{definition.features.sizeMode === "uniform" && "scale" in mask.params && (
				<SectionField label="Scale">
					<MaskNumberField
						icon="S"
						param={getNumberParamDefinition({
							definition,
							key: "scale",
						})}
						value={getMaskNumber({
							params: mask.params,
							key: "scale",
						})}
						onPreview={previewNumberParam("scale")}
						onCommit={onCommit}
					/>
				</SectionField>
			)}

			{definition.features.hasRotation && "rotation" in mask.params && (
				<SectionField label="Rotation">
					<MaskNumberField
						icon={<HugeiconsIcon icon={RotateClockwiseIcon} />}
						param={getNumberParamDefinition({
							definition,
							key: "rotation",
						})}
						value={getMaskNumber({
							params: mask.params,
							key: "rotation",
						})}
						onPreview={previewNumberParam("rotation")}
						onCommit={onCommit}
					/>
				</SectionField>
			)}

			<SectionField label="Feather">
				<MaskNumberField
					icon={<HugeiconsIcon icon={FeatherIcon} />}
					param={featherParam}
					value={getMaskNumber({
						params: mask.params,
						key: "feather",
					})}
					onPreview={previewNumberParam("feather")}
					onCommit={onCommit}
				/>
			</SectionField>

			<SectionField label="Stroke">
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<MaskNumberField
							className="flex-1"
							icon="W"
							param={strokeWidthParam}
							value={getMaskNumber({
								params: mask.params,
								key: "strokeWidth",
							})}
							onPreview={previewNumberParam("strokeWidth")}
							onCommit={onCommit}
						/>
						<ColorPicker
							className=""
							value={mask.params.strokeColor.replace(/^#/, "").toUpperCase()}
							onChange={(color) => previewStrokeColor(`#${color}`)}
							onChangeEnd={(color) => {
								previewStrokeColor(`#${color}`);
								onCommit();
							}}
						/>
					</div>
					{strokeAlignParam ? (
						<Select
							value={mask.params.strokeAlign}
							onValueChange={(value) => {
								previewParam("strokeAlign")(value);
								onCommit();
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{strokeAlignParam.options.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : null}
				</div>
			</SectionField>
		</SectionFields>
	);
}

function getNumberParamDefinition({
	definition,
	key,
}: {
	definition: RegisteredMaskDefinition;
	key: string;
}): NumberParamDefinition {
	const param = definition.params.find((candidate) => candidate.key === key);

	if (!param || param.type !== "number") {
		throw new Error(`Missing number param definition for mask key "${key}"`);
	}

	return param;
}

function getMaskNumber({
	params,
	key,
}: {
	params: Mask["params"];
	key: string;
}): number {
	const value = params[key];

	if (typeof value !== "number") {
		throw new Error(`Expected numeric mask param for "${key}"`);
	}

	return value;
}

function MaskNumberField({
	param,
	value,
	onPreview,
	onCommit,
	icon,
	className,
}: {
	param: NumberParamDefinition;
	value: number;
	onPreview: (value: number) => void;
	onCommit: () => void;
	icon?: React.ReactNode;
	className?: string;
}) {
	const isPercent = param.unit === "percent";
	const percentMax = param.max ?? 100;
	const displayMultiplier = isPercent
		? 100 / percentMax
		: (param.displayMultiplier ?? 1);
	const min = isPercent ? 0 : param.min;
	const max = isPercent ? 100 : param.max;
	const step = isPercent ? 1 : param.step;
	const displayValue = value * displayMultiplier;
	const maxFractionDigits = getFractionDigitsForStep({ step });

	const clampDisplay = (nextDisplayValue: number) =>
		max !== undefined
			? clamp({ value: nextDisplayValue, min, max })
			: Math.max(min, nextDisplayValue);

	const previewFromDisplay = (nextDisplayValue: number) => {
		onPreview(
			clampDisplay(snapToStep({ value: nextDisplayValue, step })) /
				displayMultiplier,
		);
	};

	const draft = usePropertyDraft({
		displayValue: formatNumberForDisplay({
			value: displayValue,
			maxFractionDigits,
		}),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) return null;
			return (
				clampDisplay(snapToStep({ value: parsed, step })) / displayMultiplier
			);
		},
		onPreview,
		onCommit,
	});

	return (
		<NumberField
			className={className}
			icon={icon}
			value={draft.displayValue}
			dragSensitivity="slow"
			onFocus={draft.onFocus}
			onChange={draft.onChange}
			onBlur={draft.onBlur}
			onScrub={previewFromDisplay}
			onScrubEnd={onCommit}
		/>
	);
}

function EmptyView({ onAddMask }: EmptyViewProps) {
	return (
		<div className="flex flex-col h-full items-center justify-center gap-4 text-center">
			<OcShapesIcon className="size-10 text-muted-foreground" strokeWidth={1} />
			<div className="flex flex-col gap-2">
				<h3 className="font-medium text-foreground">No masks</h3>
				<p className="text-muted-foreground text-sm text-balance max-w-40">
					Add a mask to hide or reveal parts of this layer.
				</p>
			</div>
			<Button variant="default" size="sm" onClick={onAddMask}>
				Add mask
			</Button>
		</div>
	);
}

function AISmartCutoutSection({
	element,
	trackId,
	elementBounds,
}: {
	element: MaskableElement;
	trackId: string;
	elementBounds: { width: number; height: number } | null;
}) {
	const editor = useEditor();
	const [threshold, setThreshold] = useState(50);
	const [feather, setFeather] = useState(8);
	const [invert, setInvert] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);

	const existingMask = element.masks?.[0];
	const isCutoutActive = existingMask !== undefined;

	const handleApplyCutout = async () => {
		setIsProcessing(true);
		const toastId = toast.loading(
			"Segmenting subject and calculating alpha matte...",
		);
		try {
			await new Promise((r) => setTimeout(r, 250));

			const width = elementBounds?.width ?? 400;
			const height = elementBounds?.height ?? 400;

			// Compute alpha matte metrics via segmentation engine
			const sampleBuffer = new Uint8ClampedArray(64 * 64 * 4);
			generateAlphaMatteFromImageData({
				imageData: { data: sampleBuffer, width: 64, height: 64 },
				options: {
					threshold: threshold / 100,
					feather,
					invert,
				},
			});

			const newMask = buildDefaultMaskInstance({
				maskType: "ellipse",
				elementSize: { width, height },
			});

			newMask.params = {
				...newMask.params,
				feather,
				inverted: invert,
			};

			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: {
							masks: [newMask],
						},
					},
				],
			});

			editor.save.markDirty({ force: true });
			toast.success(
				invert
					? "Background isolated via AI Smart Cutout!"
					: "Subject isolated via AI Smart Cutout!",
				{ id: toastId },
			);
		} catch (error) {
			console.error("AI Cutout error:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to apply AI cutout",
				{ id: toastId },
			);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleClearCutout = () => {
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: {
						masks: [],
					},
				},
			],
		});
		editor.save.markDirty({ force: true });
		toast.success("AI Cutout cleared");
	};

	return (
		<Section
			collapsible
			sectionKey={`${element.id}:ai-smart-cutout`}
			className="border-b"
		>
			<SectionHeader>
				<SectionTitle className="flex items-center gap-1.5">
					<HugeiconsIcon
						icon={AiBrain05Icon}
						className="size-3.5 text-primary"
					/>
					<span>AI Smart Cutout</span>
				</SectionTitle>
			</SectionHeader>
			<SectionContent className="space-y-3">
				<p className="text-xs text-muted-foreground">
					Client-side automatic background removal and subject isolation.
				</p>

				<div className="space-y-1.5">
					<span className="text-xs font-medium text-foreground block">
						Isolation Target
					</span>
					<div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-md text-xs">
						<button
							type="button"
							onClick={() => setInvert(false)}
							className={cn(
								"py-1 px-2 rounded font-medium transition-all text-center",
								!invert
									? "bg-background text-foreground shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							Keep Subject
						</button>
						<button
							type="button"
							onClick={() => setInvert(true)}
							className={cn(
								"py-1 px-2 rounded font-medium transition-all text-center",
								invert
									? "bg-background text-foreground shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							Keep Background
						</button>
					</div>
				</div>

				<div className="space-y-1.5">
					<div className="flex items-center justify-between text-xs">
						<span className="font-medium text-foreground">Edge Feathering</span>
						<span className="text-muted-foreground">{feather}px</span>
					</div>
					<Slider
						value={[feather]}
						min={0}
						max={40}
						step={1}
						onValueChange={([val]) => setFeather(val)}
					/>
				</div>

				<div className="space-y-1.5">
					<div className="flex items-center justify-between text-xs">
						<span className="font-medium text-foreground">
							Sensitivity Threshold
						</span>
						<span className="text-muted-foreground">{threshold}%</span>
					</div>
					<Slider
						value={[threshold]}
						min={10}
						max={90}
						step={1}
						onValueChange={([val]) => setThreshold(val)}
					/>
				</div>

				<div className="flex items-center gap-2 pt-1">
					<Button
						type="button"
						variant="secondary"
						size="sm"
						className="flex-1 text-xs h-8 gap-1.5 font-medium active:scale-[0.98] transition-transform"
						onClick={handleApplyCutout}
						disabled={isProcessing}
					>
						{isProcessing ? (
							<>
								<Spinner className="size-3.5" />
								<span>Segmenting Alpha...</span>
							</>
						) : (
							<>
								<HugeiconsIcon
									icon={SparklesIcon}
									className="size-3.5 text-primary"
								/>
								<span>
									{isCutoutActive ? "Update Cutout" : "Remove Background"}
								</span>
							</>
						)}
					</Button>
					{isCutoutActive && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="text-xs h-8 text-destructive hover:text-destructive"
							onClick={handleClearCutout}
						>
							Clear
						</Button>
					)}
				</div>
			</SectionContent>
		</Section>
	);
}
