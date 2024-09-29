import { TFile } from 'obsidian';
import MsgHandlerPlugin from 'main';
import React, { useEffect, useState } from 'react';
import { MdKeyboardArrowDown, MdKeyboardArrowRight, MdClose } from 'react-icons/md';
import { HiChevronDoubleRight, HiChevronDoubleLeft } from 'react-icons/hi';
import { MSGAttachment, MSGRecipient, MSGRenderData } from 'types';
import { getMsgContent } from 'utils';

/* --------------- Components ---------------- */
export default function RendererViewComponent(params: { plugin: MsgHandlerPlugin; fileToRender: TFile }) {
	const { plugin, fileToRender } = params;
	const [messageContent, setMessageContent] = useState<MSGRenderData>();

	useEffect(() => {
		getMsgContent({ plugin: plugin, msgFile: fileToRender }).then((msgContent) => {
			setMessageContent(msgContent);
		});
	}, []);

        /*
	return (
		messageContent && (
			<>
				<MSGHeaderComponent messageContent={messageContent} />
			</>
		)
	);
    */
   return <><MSGHeaderComponent messageContent={messageContent!} /></>
}

const MSGHeaderComponent = (params: { messageContent: MSGRenderData }) => {
	const { messageContent } = params;
	const [open, setOpen] = useState<boolean>(true);
	const toggleOpen = () => setOpen(!open);
	return (
		<>
			<h3 onClick={toggleOpen} className="oz-cursor-pointer oz-msg-header-name">
				<ToggleIndicator open={open} />
				Message Header
			</h3>
			{open && (
				<div className="oz-msg-handler-header">
					<strong>From</strong>: {messageContent.senderName}
					{' <'}
					<a
						aria-label={'mailTo:' + messageContent.senderEmail}
						href={'mailTo:' + messageContent.senderEmail}
						target="_blank"
						className="external-link"
						rel="noopener">
						{messageContent.senderEmail}
					</a>
					{'>'}
					<br></br>
					<strong>Recipients</strong>: <RecipientList recipients={messageContent.recipients} /> <br></br>
					<strong>Sent</strong>: {messageContent.creationTime} <br></br>
					<strong>Subject</strong>: {messageContent.subject}
				</div>
			)}
		</>
	);
};

const RecipientList = (params: { recipients: MSGRecipient[] }) => {
	const { recipients } = params;
	const [open, setOpen] = useState<boolean>();

	const moreThanOneRecipient = recipients.length > 1;

	useEffect(() => setOpen(!moreThanOneRecipient), []);

	return (
		<>
			{moreThanOneRecipient &&
				(open ? (
					<HiChevronDoubleLeft
						className="msg-handler-react-icon"
						onClick={() => setOpen(false)}
						size="18"
					/>
				) : (
					<HiChevronDoubleRight
						className="msg-handler-react-icon"
						onClick={() => setOpen(true)}
						size="18"
					/>
				))}
			{open &&
				recipients.map((recipient) => {
					return (
						<span id={recipient.email}>
							{recipient.name}
							{' <'}
							<a
								aria-label={'mailTo:' + recipient.email}
								href={'mailTo:' + recipient.email}
								target="_blank"
								className="external-link"
								rel="noopener">
								{recipient.email}
							</a>
							{'>'}
							{recipients.length > 1 ? '; ' : ''}
						</span>
					);
				})}
		</>
	);
};


const ToggleIndicator = (params: { open: boolean }) => {
	const { open } = params;
	return open ? (
		<MdKeyboardArrowDown className="msg-handler-react-icon" />
	) : (
		<MdKeyboardArrowRight className="msg-handler-react-icon" />
	);
};