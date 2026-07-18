import { google } from 'googleapis'
import type { gmail_v1 } from 'googleapis'
import { ObjectId } from 'mongodb'
import { usersCollection } from '@/lib/db/collections'
import { encryptToken, decryptToken } from '@/lib/auth/tokenCrypto'
import type { UserDoc } from '@/lib/types'

export interface UserGmailContext {
  gmail: gmail_v1.Gmail
  user: UserDoc
}

/**
 * Builds a per-user authenticated Gmail client. This is the only place token
 * refresh happens — googleapis' OAuth2Client refreshes the access token
 * transparently on expiry and emits a `tokens` event, which we persist back
 * to Mongo. NextAuth's jwt callback only ever writes tokens on initial sign-in.
 */
export async function getGmailClientForUser(
  userId: string,
): Promise<UserGmailContext> {
  const users = await usersCollection()
  const user = await users.findOne({ _id: new ObjectId(userId) })
  if (!user) {
    throw new Error(`User ${userId} not found`)
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )

  oauth2Client.setCredentials({
    access_token: decryptToken(user.gmailTokens.accessToken),
    refresh_token: decryptToken(user.gmailTokens.refreshToken),
    expiry_date: user.gmailTokens.expiryDate,
  })

  oauth2Client.on('tokens', (tokens) => {
    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (tokens.access_token) {
      update['gmailTokens.accessToken'] = encryptToken(tokens.access_token)
    }
    if (tokens.refresh_token) {
      update['gmailTokens.refreshToken'] = encryptToken(tokens.refresh_token)
    }
    if (tokens.expiry_date) {
      update['gmailTokens.expiryDate'] = tokens.expiry_date
    }
    users.updateOne({ _id: user._id }, { $set: update }).catch(() => {
      // Best-effort persist — a missed refresh-token save just means the
      // next request refreshes again; not worth failing the caller for.
    })
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  return { gmail, user }
}

export async function fetchMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
): Promise<gmail_v1.Schema$Message> {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })
  return res.data
}
