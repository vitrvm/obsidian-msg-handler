export interface CustomMessageContent {
	senderName: string;
	senderEmail: string;
	recipients: CustomRecipient[];
	creationTime: string;
	subject: string;
	body: string;
}

export interface CustomRecipient {
	name: string;
	email: string;
}

export interface DBCustomMessage extends CustomMessageContent {
	id?: number;
	filePath: string;
	mtime: number;
}
