import type { ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/en-US.json'

/** Wraps `render` with the `en-US` message catalog so components calling `useTranslations` work in tests. */
export function renderWithIntl(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en-US" messages={messages}>
        {children}
      </NextIntlClientProvider>
    ),
    ...options,
  })
}
