import { requireUser } from '@/lib/auth/requireUser'
import {
  usersCollection,
  bookmarksCollection,
  sessionsCollection,
} from '@/lib/db/collections'
import { decryptToken } from '@/lib/auth/tokenCrypto'

/** Revokes Gmail access with Google and removes the user's stored state. Action logs are kept for audit purposes. */
export async function POST() {
  const auth = await requireUser()
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await usersCollection()
  const user = await users.findOne({ _id: auth.userId })
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  const refreshToken = decryptToken(user.gmailTokens.refreshToken)
  await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken }),
  }).catch(() => {
    // Best-effort — even if Google's revoke call fails, local state is still removed.
  })

  const [bookmarks, sessions] = await Promise.all([
    bookmarksCollection(),
    sessionsCollection(),
  ])
  await Promise.all([
    users.deleteOne({ _id: auth.userId }),
    bookmarks.deleteOne({ userId: auth.userId }),
    sessions.deleteMany({ userId: auth.userId }),
  ])

  return Response.json({ disconnected: true })
}
