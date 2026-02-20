import { MarkdownView, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, LectureLightSettings, LectureLightSettingTab } from "./settings";
import { parseMarkdownToSlides } from "./lib/parser";
import { ParseResult } from "./types";

export default class LectureLightPlugin extends Plugin {
	settings: LectureLightSettings;

	// Holds the most recent parse result; consumed by LectureLightView in Phase C
	lastParseResult: ParseResult | null = null;

	async onload() {
		await this.loadSettings();

		// eslint-disable-next-line obsidianmd/ui/sentence-case
		this.addRibbonIcon('presentation', 'LectureLight Pro', (_evt: MouseEvent) => {
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			new Notice('LectureLight Pro loaded.');
		});

		this.addSettingTab(new LectureLightSettingTab(this.app, this));

		// Re-parse when the user switches to a different note
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				void this.parseActiveNote();
			})
		);

		// Re-parse when the active file is modified
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && file.path === activeFile.path) {
					void this.parseActiveNote();
				}
			})
		);

		// Parse immediately in case a note is already open when the plugin loads
		void this.parseActiveNote();
	}

	onunload() {
		console.debug('Unloading LectureLight Pro');
	}

	async parseActiveNote(): Promise<void> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView?.file) {
			this.lastParseResult = null;
			return;
		}

		try {
			const content = await this.app.vault.read(activeView.file);
			const result = parseMarkdownToSlides(content);
			this.lastParseResult = result;
			console.debug(
				`[LectureLight] Parsed "${activeView.file.basename}":`,
				`${result.slides.length} slide(s),`,
				result.timerSettings
					? `timer: ${result.timerSettings.targetMinutes}min target`
					: 'no timer config (will use settings defaults)'
			);
		} catch (e) {
			console.error('[LectureLight] Failed to read or parse note:', e);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as LectureLightSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
