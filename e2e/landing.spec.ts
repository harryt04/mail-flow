import { test, expect } from '@playwright/test'

test('landing page displays sign-in flow when unauthenticated', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('MailFlow')
  // The landing should have a sign-in button / CTA
  await expect(
    page.getByRole('link', { name: /sign in|login|google/i }),
  ).toBeVisible()
})
