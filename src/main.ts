import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, LectureLightSettings, LectureLightSettingTab } from "./settings";

export default class LectureLightPlugin extends Plugin {
	settings: LectureLightSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		this.addRibbonIcon('presentation', 'LectureLight Pro', (_evt: MouseEvent) => {
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			new Notice('LectureLight Pro loaded.');
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LectureLightSettingTab(this.app, this));
	}

	onunload() {
		console.debug('Unloading LectureLight Pro');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as LectureLightSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
