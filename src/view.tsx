import { ItemView, WorkspaceLeaf } from 'obsidian';
import { StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { PresenterConsole } from './components/PresenterConsole';
import type LectureLightPlugin from './main';

export const VIEW_TYPE_PRESENTER = 'lecturelight-presenter';

export class LectureLightView extends ItemView {
	private reactRoot: Root | null = null;
	private plugin: LectureLightPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: LectureLightPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_PRESENTER;
	}

	getDisplayText(): string {
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		return 'LectureLight';
	}

	getIcon(): string {
		return 'presentation';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('ll-presenter-root');
		this.reactRoot = createRoot(container);
		this.renderReact();
	}

	async onClose(): Promise<void> {
		this.reactRoot?.unmount();
		this.reactRoot = null;
	}

	/** Called by the plugin after every successful parse. */
	updatePresentation(): void {
		this.renderReact();
	}

	private renderReact(): void {
		if (!this.reactRoot) return;
		this.reactRoot.render(
			<StrictMode>
				<PresenterConsole
					parseResult={this.plugin.lastParseResult}
					settings={this.plugin.settings}
					app={this.app}
					sourceFilePath={this.plugin.lastSourceFilePath}
					sourceFileBasename={this.plugin.lastSourceFileBasename}
				/>
			</StrictMode>
		);
	}
}
