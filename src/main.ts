import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, LectureLightSettings, LectureLightSettingTab } from "./settings";

export default class LectureLightPlugin extends Plugin {
	settings: LectureLightSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('presentation', 'LectureLight Pro', (evt: MouseEvent) => {
			new Notice('LectureLight Pro is loaded!');
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LectureLightSettingTab(this.app, this));
	}

	onunload() {
		console.log('Unloading LectureLight Pro');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
