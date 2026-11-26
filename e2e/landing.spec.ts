import { test, expect } from '@playwright/test'
import messages from '../src/messages/en-US.json'

test('landing page displays sign-in flow when unauthenticated', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    messages.landing.hero.heading,
  )
  const buttons = page.getByRole('button', {
    name: messages.landing.signIn.button,
  })
  await expect(buttons).toHaveCount(2)
  await expect(buttons.first()).toBeVisible()
})
