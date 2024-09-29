import { Plugin, TFile, addIcon, WorkspaceLeaf } from 'obsidian';
import {
	ICON,
	SEARCH_VIEW_TYPE,
	RENDER_VIEW_TYPE,
	MsgHandlerView,
	MsgHandlerSearchView,
} from 'view';
//import { getEmlContent } from 'email';
import { getMsgContent } from 'utils';
import { MSG_HANDLER_ENVELOPE_ICON } from 'icon';
import {
	createDBMessageContent,
	deleteDBMessageContentById,
	getDBMessageContentsByPath,
	syncDatabaseWithVaultFiles,
	updateFilePathOfAllRecords,
} from 'database';


// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}


export default class MsgHandlerPlugin extends Plugin {
	
	settings: MyPluginSettings;
	
	acceptedExtensions: string[] = ['msg', 'eml'];
	ribbonIconEl: HTMLElement | undefined = undefined;


	async onload() {

		// --> Add Icons
		addIcon(ICON, MSG_HANDLER_ENVELOPE_ICON);

		await this.loadSettings();

		this.registerView(RENDER_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
			return new MsgHandlerView(leaf, this);
		});

		// --> Register Plugin Search View
		this.registerView(SEARCH_VIEW_TYPE, (leaf) => {
			return new MsgHandlerSearchView(leaf, this);
		});

		// --> Add Event listeners for vault file changes (create, delete, rename)
		this.app.vault.on('create', this.handleFileCreate);
		this.app.vault.on('delete', this.handleFileDelete);
		this.app.vault.on('rename', this.handleFileRename);

		// Add command 
		this.addCommand({
			id: 'reveal-msg-handler-search-leaf',
			name: 'Reveal Searcg Leaf',
			callback: () => {
				this.openMsgHandlerSearchLeaf({ showAfterAttach: true });
			}
		})

		// Ribbon Icon that opens LeftLeaf
		this.ribbonIconEl = this.addRibbonIcon(ICON, 'Sample Plugin', async () => {
			await this.openMsgHandlerSearchLeaf({ showAfterAttach: true });
		});
		// Create listener for on-drop
		// Check if file droped is *.eml -> 
		// 		If False -> None
		//		If True -> Show text

		// Create listener if file removed
		// 		If False -> None
		// 		If True -> Remove text
		
	}

	onunload() {

	}

	openMsgHandlerSearchLeaf = async (params: { showAfterAttach: boolean }) => {
		const { showAfterAttach } = params;
		let leafs = this.app.workspace.getLeavesOfType(SEARCH_VIEW_TYPE);
		if (leafs.length === 0) {
			let leaf = this.app.workspace.getLeftLeaf(false);
			await leaf?.setViewState({ type: SEARCH_VIEW_TYPE, active: true });
			if (showAfterAttach && leaf != null) {
				this.app.workspace.revealLeaf(leaf);
			}
		} else {
			if (showAfterAttach && leafs.length > 0) {
				this.app.workspace.revealLeaf(leafs[0]);
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	handleFileCreate = async (file: TFile) => {
		if (this.acceptedExtensions.contains(file.extension)) {
			let dbMsgContents = await getDBMessageContentsByPath({ filePath: file.path });
			if (dbMsgContents.length === 0) {
				let msgContent = await getMsgContent({ plugin: this, msgFile: file });
				createDBMessageContent({
					msgContent: msgContent,
					file: file as TFile,
				});
				//if (this.settings.logEnabled) console.log(`DB Index Record is created for ${file.path}`);
			}
		}
	};

	handleFileDelete = async (file: TFile) => {
		if (this.acceptedExtensions.contains(file.extension)) {
			
		}
	};

	handleFileRename = async (file: TFile) => {
		if (this.acceptedExtensions.contains(file.extension)) {
			//console.log("File renamed")
		}
	};
}
