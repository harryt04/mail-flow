import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { signIn } from '@/lib/auth/options'
import { Button } from '@/components/ui/Button'
import { IconGoogle } from '@/components/ui/icons'

/** Shared sign-in action, used by both the hero and the closing CTA. */
export async function GoogleSignInForm() {
  const t = await getTranslations('landing.signIn')

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
          {t('button')}
        </Button>
      </form>
      <p className="text-body-sm text-text-secondary">
        {t.rich('consent', {
          terms: (chunks) => (
            <Link href="/tos" className="hover:text-text-primary underline">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="hover:text-text-primary underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  )
}
