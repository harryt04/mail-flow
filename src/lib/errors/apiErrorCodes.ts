/**
 * Stable, machine-readable codes for API error responses — paired with a
 * human-readable `error` string (English, log-friendly fallback) on every
 * response. Clients translate the `code` via the `apiErrors` message
 * namespace instead of displaying `error` directly, so API responses don't
 * need to be locale-aware themselves. See docs/app/api/README.md.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'USER_NOT_FOUND'
  | 'SESSION_MESSAGE_REQUIRED'
  | 'MOVE_FIELDS_REQUIRED'
  | 'REPLY_FIELDS_REQUIRED'
  | 'JUMP_FAILED'
  | 'LABEL_NAME_REQUIRED'
  | 'LABEL_CREATE_FAILED'
  | 'OPENAI_KEY_REQUIRED'
  | 'TRANSCRIPT_REQUIRED'
  | 'INVALID_INBOX_SCOPE'
  | 'INVALID_INBOX_ORDER'
  | 'INVALID_INBOX_CATEGORY'
  | 'INVALID_INBOX_LABEL_ID'
  | 'INVALID_AUTO_SKIP_CATEGORIES'
  | 'INVALID_THEME'
  | 'INVALID_VOICE_TONE'
  | 'INVALID_PLAYBACK_SPEED'
  | 'NO_VALID_FIELDS'
  | 'API_KEY_REQUIRED'
  | 'INVALID_OPENAI_KEY'
  | 'AUDIO_REQUIRED'
  | 'TEXT_REQUIRED'
  | 'VOICE_SERVICE_ERROR'
