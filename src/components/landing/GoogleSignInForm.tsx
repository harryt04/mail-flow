import Link from 'next/link'
import { signIn } from '@/lib/auth/options'
import { Button } from '@/components/ui/Button'
import { IconGoogle } from '@/components/ui/icons'

/** Shared sign-in action, used by both the hero and the closing CTA. */
export function GoogleSignInForm() {
  return (
    <div className="flex flex-col items-center gap-3">
      <form
        action={async () => {
          'use server'
          await signIn('google', { redirectTo: '/home' })
        }}
      >
        <Button
          type="submit"
          size="lg"
          variant="google"
          icon={<IconGoogle className="h-5 w-5" />}
        >
          Sign in with Google
        </Button>
      </form>
      <p className="text-body-sm text-text-secondary">
        By continuing you agree to our{' '}
        <Link href="/tos" className="hover:text-text-primary underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="hover:text-text-primary underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
