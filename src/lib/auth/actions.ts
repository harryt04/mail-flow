'use server'

import { signOut } from '@/lib/auth/options'

export async function signOutAction() {
  await signOut({ redirectTo: '/' })
}
