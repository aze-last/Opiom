import type { Metadata } from "next";
import Link from "next/link";
import { BasePage } from "@/app/base-page";
import { AiProviderSettings } from "@/components/settings/ai-provider-settings";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Folder02Icon, SecurityCheckIcon } from "@hugeicons/core-free-icons";

export const metadata: Metadata = {
	title: "AI & LLM Settings - OpenCut",
	description:
		"Bring your own API key and custom Base URL for AI Clipper and local/cloud LLM models in OpenCut.",
};

export default function SettingsPage() {
	return (
		<BasePage
			title="AI & LLM Configuration"
			description="Bring your own API keys, custom Base URL, and custom models for the AI Clipper. Your secrets never leave your browser."
			maxWidth="3xl"
			action={
				<div className="flex items-center justify-center gap-3 mt-4">
					<Button asChild variant="outline" size="sm" className="gap-2">
						<Link href="/projects">
							<HugeiconsIcon icon={Folder02Icon} className="size-4" />
							<span>My Projects</span>
						</Link>
					</Button>
				</div>
			}
		>
			<div className="flex flex-col gap-8">
				{/* Security Notice Card */}
				<div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 text-xs">
					<HugeiconsIcon
						icon={SecurityCheckIcon}
						className="size-5 text-primary shrink-0 mt-0.5"
					/>
					<div className="space-y-1">
						<p className="font-semibold text-foreground">
							Zero-Knowledge Local Storage
						</p>
						<p className="text-muted-foreground leading-relaxed">
							OpenCut is 100% local-first and client-side. Your API keys are
							stored solely in your browser's encrypted local storage and are
							sent directly to your specified endpoint. No intermediate servers
							or telemetry track your prompts.
						</p>
					</div>
				</div>

				{/* Settings Form */}
				<AiProviderSettings />
			</div>
		</BasePage>
	);
}
