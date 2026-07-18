import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth/options'

export interface AuthenticatedUser {
  userId: ObjectId
  email: string
}

/** Returns null if unauthenticated — callers should respond 401. Proxy already blocks most of this, but route handlers stay defensive. */
export async function requireUser(): Promise<AuthenticatedUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return {
    userId: new ObjectId(session.user.id),
    email: session.user.email ?? '',
  }
}
