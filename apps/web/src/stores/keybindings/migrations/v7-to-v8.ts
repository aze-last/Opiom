import type { KeybindingConfig } from "@/lib/actions/keybinding";

interface V7State {
	keybindings: KeybindingConfig;
	isCustomized: boolean;
}

export function v7ToV8({ state }: { state: unknown }): unknown {
	const v7 = state as V7State;
	const keybindings = { ...v7.keybindings };

	if (!keybindings["alt+s"]) {
		keybindings["alt+s"] = "remove-silence";
	}

	return { ...v7, keybindings };
}
