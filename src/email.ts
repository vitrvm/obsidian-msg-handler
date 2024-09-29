import { TFile } from "obsidian";

import { readEml } from 'eml-parse-js';
import { ReadedEmlJson } from 'eml-parse-js/dist/interface';

import MsgHandlerPlugin from "main";


export const getEmlContent = async (params: {
    plugin: MsgHandlerPlugin;
	emlFile: TFile;
}) => {
    const { plugin, emlFile } = params;

    if (emlFile.extension === 'eml') {
		// Read and parse eml file
        let emlMsg = await readEmlFile({ emlFile, plugin });
        let sender = parseEmlSender({ senderText: emlMsg.headers.From! });

        return {
            senderName: sender.senderName,
            senderEmail: sender.senderEmail,
            senderDate: emlMsg.data,
            senderSubject: emlMsg.subject
        }
    }		
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