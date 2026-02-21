import { App, PluginSettingTab, Setting } from "obsidian";
import LectureLightPlugin from "./main";

export interface LectureLightSettings {
	targetMinutes:   number;
	warningMinutes:  number;
	wrapUpMinutes:   number;
	recordingFolder: string;
}

export const DEFAULT_SETTINGS: LectureLightSettings = {
	targetMinutes:   30,
	warningMinutes:  5,
	wrapUpMinutes:   2,
	recordingFolder: 'LectureLight/Recordings',
};

export class LectureLightSettingTab extends PluginSettingTab {
	plugin: LectureLightPlugin;

	constructor(app: App, plugin: LectureLightPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Timer defaults').setHeading();

		new Setting(containerEl)
			.setName('Target duration')
			.setDesc('Default target duration in minutes (used when no :::lecturelight block is present).')
			.addText(text => text
				.setPlaceholder('30')
				.setValue(String(this.plugin.settings.targetMinutes))
				.onChange(async (value) => {
					const n = parseInt(value, 10);
					if (!isNaN(n) && n > 0) {
						this.plugin.settings.targetMinutes = n;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Warning threshold')
			.setDesc('Minutes remaining at which the timer turns orange.')
			.addText(text => text
				.setPlaceholder('5')
				.setValue(String(this.plugin.settings.warningMinutes))
				.onChange(async (value) => {
					const n = parseInt(value, 10);
					if (!isNaN(n) && n >= 0) {
						this.plugin.settings.warningMinutes = n;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Wrap-up threshold')
			.setDesc('Minutes remaining at which the timer turns red.')
			.addText(text => text
				.setPlaceholder('2')
				.setValue(String(this.plugin.settings.wrapUpMinutes))
				.onChange(async (value) => {
					const n = parseInt(value, 10);
					if (!isNaN(n) && n >= 0) {
						this.plugin.settings.wrapUpMinutes = n;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl).setName('Recording').setHeading();

		new Setting(containerEl)
			.setName('Recordings folder')
			.setDesc('Vault folder where audio recordings and session logs are saved.')
			.addText(text => text
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setPlaceholder('LectureLight/Recordings')
				.setValue(this.plugin.settings.recordingFolder)
				.onChange(async (value) => {
					this.plugin.settings.recordingFolder = value.trim() || DEFAULT_SETTINGS.recordingFolder;
					await this.plugin.saveSettings();
				}));
	}
}
