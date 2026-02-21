import { MarkdownView, Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, LectureLightSettings, LectureLightSettingTab } from "./settings";
import { parseMarkdownToSlides } from "./lib/parser";
import { resolveWikilinks } from "./lib/wikilinks";
import { ParseResult } from "./types";
import { LectureLightView, VIEW_TYPE_PRESENTER } from "./view";
import { LectureLightStageView, VIEW_TYPE_STAGE } from "./stageView";
import { PRESENTER_CSS } from "./presenterStyles";

export default class LectureLightPlugin extends Plugin {
	settings: LectureLightSettings;

	// Holds the most recent parse result; consumed by LectureLightView
	lastParseResult: ParseResult | null = null;
	lastSourceFilePath: string | null = null;
	lastSourceFileBasename: string | null = null;

	async onload() {
		await this.loadSettings();

		// Inject presenter styles via JS so they're always in sync with main.js.
		// eslint-disable-next-line obsidianmd/no-forbidden-elements
		const styleEl = document.createElement('style');
		styleEl.id = 'll-presenter-styles';
		styleEl.textContent = PRESENTER_CSS;
		document.head.appendChild(styleEl);
		this.register(() => styleEl.remove());

		// Register the presenter view
		this.registerView(
			VIEW_TYPE_PRESENTER,
			(leaf: WorkspaceLeaf) => new LectureLightView(leaf, this)
		);

		// Register the stage (audience) view
		this.registerView(
			VIEW_TYPE_STAGE,
			(leaf: WorkspaceLeaf) => new LectureLightStageView(leaf)
		);

		// eslint-disable-next-line obsidianmd/ui/sentence-case
		this.addRibbonIcon('presentation', 'LectureLight Pro', (_evt: MouseEvent) => {
			void this.activateView();
		});

		this.addSettingTab(new LectureLightSettingTab(this.app, this));

		this.addCommand({
			id: 'open-presenter',
			name: 'Open presenter console',
			callback: () => { void this.activateView(); },
		});

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
		this.app.workspace.onLayoutReady(() => {
			void this.parseActiveNote();
		});
	}

	onunload() {
		console.debug('[LectureLight] Unloading LectureLight Pro');
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_PRESENTER)[0];
		if (!leaf) {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: VIEW_TYPE_PRESENTER, active: true });
		}
		await workspace.revealLeaf(leaf);
	}

	async parseActiveNote(): Promise<void> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView?.file) {
			// No markdown note is active (e.g. the presenter tab itself is focused).
			// Retain the last parse result so the presenter keeps its slides visible.
			return;
		}

		try {
			const content = await this.app.vault.read(activeView.file);
			const resolved = resolveWikilinks(content, this.app);
			const result = parseMarkdownToSlides(resolved);
			this.lastParseResult = result;
			this.lastSourceFilePath = activeView.file.path;
			this.lastSourceFileBasename = activeView.file.basename;
			console.debug(
				`[LectureLight] Parsed "${activeView.file.basename}":`,
				`${result.slides.length} slide(s),`,
				result.timerSettings
					? `timer: ${result.timerSettings.targetMinutes}min target`
					: 'no timer config (will use settings defaults)'
			);
			this.notifyViews();
		} catch (e) {
			console.error('[LectureLight] Failed to read or parse note:', e);
		}
	}

	private notifyViews(): void {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_PRESENTER).forEach(leaf => {
			if (leaf.view instanceof LectureLightView) {
				leaf.view.updatePresentation();
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as LectureLightSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
