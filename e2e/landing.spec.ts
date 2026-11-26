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

type MockTool = { name: string; execute: (input: object) => Promise<unknown> }
declare global {
  interface Window {
    mockAgentTools: Map<string, MockTool>
  }
}

test('WebMCP can read the landing controls and refuses sign-in', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const registered = new Map<string, MockTool>()
    window.mockAgentTools = registered
    Object.defineProperty(document, 'modelContext', {
      value: {
        registerTool: async (tool: MockTool) => {
          registered.set(tool.name, tool)
        },
      },
    })
  })
  await page.goto('/')
  const registered = () =>
    page.evaluate(() => [...window.mockAgentTools.keys()].sort())
  await expect.poll(registered).toEqual(['act', 'query', 'snapshot'])
  const result = await page.evaluate(async (label) => {
    const registered = window.mockAgentTools
    const entries = (await registered.get('snapshot')!.execute({})) as {
      ref: string
      label?: string
    }[]
    const button = entries.find((entry) => entry.label === label)
    if (!button)
      throw new Error('Sign-in button missing from the agent snapshot')
    return (await registered
      .get('act')!
      .execute({ steps: [{ ref: button.ref, action: 'press' }] })) as {
      ok: boolean
    }
  }, messages.landing.signIn.button)
  expect(result.ok).toBe(false)
  await expect(page).toHaveURL('/')
})
