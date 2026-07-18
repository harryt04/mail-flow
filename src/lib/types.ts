import type { ObjectId } from "mongodb";

export type InboxScope = "unread" | "all";
export type InboxOrder = "oldest" | "newest";
export type ThemePreference = "system" | "light" | "dark";

export interface EncryptedTokenPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface UserSettings {
  inboxScope: InboxScope;
  inboxOrder: InboxOrder;
  theme: ThemePreference;
  voiceTone?: string;
}

export interface UserDoc {
  _id: ObjectId;
  googleId: string;
  email: string;
  name: string;
  image?: string;
  gmailTokens: {
    accessToken: EncryptedTokenPayload;
    refreshToken: EncryptedTokenPayload;
    expiryDate: number;
  };
  settings: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionStatus = "active" | "exhausted";

export interface ListeningSessionDoc {
  _id: ObjectId;
  userId: ObjectId;
  status: SessionStatus;
  scope: InboxScope;
  order: InboxOrder;
  messageIds: string[];
  cursorIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkDoc {
  _id: ObjectId;
  userId: ObjectId;
  activeSessionId: ObjectId;
  lastProcessedMessageId: string | null;
  updatedAt: Date;
}

export type EmailAction = "skip" | "archive" | "delete" | "reply" | "snooze";

export interface EmailActionLogDoc {
  _id: ObjectId;
  userId: ObjectId;
  sessionId: ObjectId;
  messageId: string;
  action: EmailAction;
  replyText?: string;
  timestamp: Date;
}

export interface ParsedEmail {
  messageId: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  paragraphs: string[];
}

export interface CheckpointPayload {
  sessionId: string;
  remaining: number;
  email: ParsedEmail | null;
  sessionExhausted: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  inboxScope: "unread",
  inboxOrder: "oldest",
  theme: "system",
};
