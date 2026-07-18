import Link from 'next/link'
import { signOut } from '@/lib/auth/options'

export function AppHeader() {
  return (
    <header className="border-border flex items-center justify-between border-b px-6 py-4">
      <Link href="/home" className="text-h2 text-text-primary font-bold">
        MailFlow
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/inbox"
          className="text-body text-text-secondary hover:text-text-primary"
        >
          Inbox
        </Link>
        <Link
          href="/settings"
          className="text-body text-text-secondary hover:text-text-primary"
        >
          Settings
        </Link>
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/' })
          }}
        >
          <button
            type="submit"
            className="text-body text-text-secondary hover:text-text-primary"
          >
            Sign out
          </button>
        </form>
      </nav>
    </header>
  )
}
