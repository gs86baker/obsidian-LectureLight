import { App, PluginSettingTab, Setting } from "obsidian";
import LectureLightPlugin from "./main";

export interface LectureLightSettings {
	targetMinutes: number;
	warningMinutes: number;
	wrapUpMinutes: number;
}

export const DEFAULT_SETTINGS: LectureLightSettings = {
	targetMinutes: 30,
	warningMinutes: 5,
	wrapUpMinutes: 2
}

export class LectureLightSettingTab extends PluginSettingTab {
	plugin: LectureLightPlugin;

	constructor(app: App, plugin: LectureLightPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Target duration')
			.setDesc('Default target duration in minutes')
			.addText(text => text
				.setPlaceholder('30')
				.setValue(String(this.plugin.settings.targetMinutes))
				.onChange(async (value) => {
					this.plugin.settings.targetMinutes = Number(value);
					await this.plugin.saveSettings();
				}));
	}
}
