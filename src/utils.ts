import { MarkdownRenderer, Component, TFile } from 'obsidian';
import MsgHandlerPlugin from 'main';
import { MSGReader } from 'modules/msgreader';
import { readEml, ReadedEmlJson } from 'eml-parse-js';
import dayjs from 'dayjs';
import { Base64 } from 'js-base64';
import {
	MSGRenderData,
	MSGRecipient,
	MSGAttachment,
	Ext_MSGReader_FileData,
	Ext_MSGReader_Attachment,
	Ext_MSGReader_AttachmentData,
	Ext_MSGReader_Recipient,
} from 'types';


export const getMsgContent = async (params: {
	plugin: MsgHandlerPlugin;
	msgFile: TFile;
}): Promise<MSGRenderData> => {
	const { plugin, msgFile } = params;
	if (msgFile.extension === 'msg') {
		let msgFileBuffer = await plugin.app.vault.readBinary(params.msgFile);
		let msgReader = new MSGReader(msgFileBuffer);
		let fileData = msgReader.getFileData() as Ext_MSGReader_FileData;
		let creationTime = getMsgDate({ rawHeaders: fileData.headers });
		return {
			senderName: dataOrEmpty(fileData.senderName),
			senderEmail: dataOrEmpty(fileData.senderEmail),
			recipients: getCustomRecipients(fileData.recipients ? fileData.recipients : []),
			creationTime:
				typeof creationTime === 'string'
					? creationTime
					: dayjs(creationTime).format('ddd, D MMM YYYY HH:mm:ss'),
			subject: dataOrEmpty(fileData.subject),
			body: dataOrEmpty(fileData.body),
			attachments: extractMSGAttachments({
				msgReader: msgReader,
				fileDataAttachments: fileData.attachments,
			}),
		};
	} else if (msgFile.extension === 'eml') {
		let readedEmlJson = await readEmlFile({ emlFile: msgFile, plugin: plugin });
		let sender = parseEmlSender({ senderText: readedEmlJson.headers.From! });
		return {
			senderName: sender.senderName,
			senderEmail: sender.senderEmail,
			recipients: parseEMLRecipients({ readEmlJson: readedEmlJson }),
			creationTime: dayjs(readedEmlJson.date).format('ddd, D MMM YYYY HH:mm:ss'),
			subject: dataOrEmpty(readedEmlJson.subject),
			body: cleanEMLBody({ text: readedEmlJson.text! }),
			attachments: extractEMLAttachments({ emlFileReadJson: readedEmlJson }),
		};
	}
    return {
        senderName: '',
        senderEmail: '',
        recipients: [],
        creationTime: '',
        subject: '',
        body: '',
        attachments: [],
    };
};

function parseHeaders(params: { headers: string }): { [key: string]: string } {
	const { headers } = params;
	var parsedHeaders: { [key: string]: string } = {};
	if (!headers) return parsedHeaders;
	var headerRegEx = /(.*)\: (.*)/g;
	let m;
	while ((m = headerRegEx.exec(headers))) {
		// todo: Pay attention! Header can be presented many times (e.g. Received).
		// Handle it, if needed!
		parsedHeaders[m[1]] = m[2];
	}
	return parsedHeaders;
}

const parseEmlSender = (params: { senderText: string }): { senderName: string; senderEmail: string } => {
	let { senderText } = params;
	if (senderText === '' || senderText === undefined || senderText === null) {
		return { senderName: '', senderEmail: '' };
	}
	senderText = senderText.replace(/"/g, '');
	const regex = /^([^<]+) <([^>]+)>$/;
	const match = regex.exec(senderText);
	if (!match) return { senderName: '', senderEmail: '' };
	const [, senderName, senderEmail] = match;
	return { senderName, senderEmail };
};

function getMsgDate(params: { rawHeaders: string }): string | Date {
	const { rawHeaders } = params;
	// Example for the Date header
	var headers = parseHeaders({ headers: rawHeaders });
	if (!headers['Date']) {
		return '-';
	}
	return new Date(headers['Date']);
}

const getCustomRecipients = (recipients: Ext_MSGReader_Recipient[]): MSGRecipient[] => {
	if (recipients && recipients.length > 0) {
		let customRecipients = [];
		for (let recipient of recipients) {
			customRecipients.push({
				name: dataOrEmpty(recipient.name),
				email: dataOrEmpty(recipient.email),
			});
		}
		return customRecipients;
	} else {
		return [];
	}
};

const cleanEMLBody = (params: { text: string }) => {
	if (!params.text) return '';
	let cleanTxt = params.text.replace(/\r\n\r\n/g, '\r\n\r\n \r\n\r\n');
	const pattern = /\[cid:.*?\]/g;
	return cleanTxt.replace(pattern, '');
};

const parseEMLRecipients = (params: { readEmlJson: ReadedEmlJson }): MSGRecipient[] => {
	const { readEmlJson } = params;
	let emlTo = dataOrEmpty(readEmlJson.headers.To);
	let emlCC = dataOrEmpty(readEmlJson.headers.CC);
	let recipientsText = emlTo + (emlCC === '' ? '' : ', ' + emlCC);
	let recipientsTextSplit = recipientsText.split('>,');
	const regex = /"([^"]+)"\s*<?([^>\s]+)>?/;
	let msgRecipients = [];
	for (let recipientText of recipientsTextSplit) {
		const match = recipientText.match(regex);
		if (match) {
			const name = match[1] || match[3];
			const email = match[2] || match[4];
			msgRecipients.push({ name, email });
		}
	}
	return msgRecipients;
};

const readEmlFile = async (params: { emlFile: TFile; plugin: MsgHandlerPlugin }): Promise<ReadedEmlJson> => {
	const { emlFile, plugin } = params;
	let emlFileRead = await plugin.app.vault.read(emlFile);
	return new Promise((resolve, reject) => {
		readEml(emlFileRead, (err, ReadedEMLJson) => {
			if (err) {
				reject(err);
			} else {
				resolve(ReadedEMLJson!);
			}
		});
	});
};

const extractMSGAttachments = (params: {
	msgReader: MSGReader;
	fileDataAttachments: Ext_MSGReader_Attachment[];
}): MSGAttachment[] => {
	const { msgReader, fileDataAttachments } = params;
	let msgAttachments: MSGAttachment[] = [];
	for (let [index, fileDataAttachment] of fileDataAttachments.entries()) {
		let attRead = msgReader.getAttachment(index) as Ext_MSGReader_AttachmentData;
		msgAttachments.push({
			fileName: attRead.fileName,
			fileExtension: fileDataAttachment.extension,
			fileBase64: attRead.content ? uint8ArrayToBase64(attRead.content) : '{}',
		});
	}
	return msgAttachments;
};

const extractEMLAttachments = (params: { emlFileReadJson: ReadedEmlJson }): MSGAttachment[] => {
	const { emlFileReadJson } = params;

	if (emlFileReadJson.attachments && emlFileReadJson.attachments.length > 0) {
		let attachments: MSGAttachment[] = [];
		for (let attachment of params.emlFileReadJson.attachments!) {
			let fileNameParts = attachment.name.split('.');
			let extension = fileNameParts[fileNameParts.length - 1];
			attachments.push({
				fileName: attachment.name,
				fileExtension: '.' + extension,
				fileBase64: attachment.data64,
			});
		}
		return attachments;
	} else {
		return [];
	}
};

const dataOrEmpty = (data: any) => {
	return data ? data : '';
};

export function base64ToArrayBuffer(base64: string): Uint8Array {
	var binary_string = window.atob(base64);
	var len = binary_string.length;
	var bytes = new Uint8Array(len);
	for (var i = 0; i < len; i++) {
		bytes[i] = binary_string.charCodeAt(i);
	}
	return bytes;
}

/**
 * Converts uint8Array to Base64 String
 * @param uint8Array
 * @returns
 */
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
	return Base64.fromUint8Array(uint8Array);
}

/* ---------- search utils ------------ */

export const getFileName = (filePath: string) => {
	var index = filePath.lastIndexOf('/');
	if (index !== -1) return filePath.substring(index + 1);
	return filePath;
};

export const replaceNewLinesAndCarriages = (txt: string) => {
	return txt?.replace(/[\r\n]+/g, '');
};

export const openFile = (params: {
	file: TFile;
	plugin: MsgHandlerPlugin;
	newLeaf: boolean;
	leafBySplit?: boolean;
}) => {
	const { file, plugin, newLeaf, leafBySplit } = params;
	let leaf = plugin.app.workspace.getLeaf(newLeaf);
	if (!newLeaf && leafBySplit) leaf = plugin.app.workspace.createLeafBySplit(leaf, 'vertical');
	plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
	leaf.openFile(file, { eState: { focus: true } });
};

export const openFileInNewTab = (params: { plugin: MsgHandlerPlugin; file: TFile }) => {
	openFile({ file: params.file, plugin: params.plugin, newLeaf: true });
};

export function isMouseEvent(e: React.TouchEvent | React.MouseEvent): e is React.MouseEvent {
	return e && 'screenX' in e;
}