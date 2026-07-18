import type { ObjectId } from 'mongodb'

export type InboxScope = 'unread' | 'all'
export type InboxOrder = 'oldest' | 'newest'
export type ThemePreference = 'system' | 'light' | 'dark'

export interface EncryptedTokenPayload {
  ciphertext: string
  iv: string
  authTag: string
}

export const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

export interface UserSettings {
  inboxScope: InboxScope
  inboxOrder: InboxOrder
  theme: ThemePreference
  voiceTone?: string
  /** Multiplier applied to TTS playback via the client `<audio>` element's `playbackRate`. Optional so existing user docs default to 1x without a migration. */
  playbackSpeed?: PlaybackSpeed
}

export interface UserDoc {
  _id: ObjectId
  googleId: string
  email: string
  name: string
  image?: string
  gmailTokens: {
    accessToken: EncryptedTokenPayload
    refreshToken: EncryptedTokenPayload
    expiryDate: number
  }
  settings: UserSettings
  createdAt: Date
  updatedAt: Date
}

export type SessionStatus = 'active' | 'exhausted'

export interface ListeningSessionDoc {
  _id: ObjectId
  userId: ObjectId
  status: SessionStatus
  scope: InboxScope
  order: InboxOrder
  messageIds: string[]
  cursorIndex: number
  /** Gmail's `resultSizeEstimate` for the query behind this snapshot — optional so pre-existing session docs (created before this field existed) don't need a migration. */
  totalEstimate?: number
  createdAt: Date
  updatedAt: Date
}

export interface BookmarkDoc {
  _id: ObjectId
  userId: ObjectId
  activeSessionId: ObjectId
  lastProcessedMessageId: string | null
  updatedAt: Date
}

export type EmailAction =
  'skip' | 'archive' | 'delete' | 'reply' | 'snooze' | 'move'

export interface EmailActionLogDoc {
  _id: ObjectId
  userId: ObjectId
  sessionId: ObjectId
  messageId: string
  action: EmailAction
  replyText?: string
  /** Gmail label name the message was sorted into — set only for "move" actions. */
  label?: string
  timestamp: Date
}

export interface ParsedEmail {
  messageId: string
  threadId: string
  sender: string
  senderEmail: string
  subject: string
  paragraphs: string[]
}

export interface CheckpointPayload {
  sessionId: string
  remaining: number
  email: ParsedEmail | null
  sessionExhausted: boolean
  /** Snapshot size cap vs. Gmail's true (approximate) count — see `ListeningSessionDoc.totalEstimate`. */
  totalEstimate: number
  snapshotSize: number
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  inboxScope: 'unread',
  inboxOrder: 'oldest',
  theme: 'system',
  playbackSpeed: 1,
}
