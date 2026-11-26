import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SettingsClient } from './SettingsClient'

vi.mock('next/navigation', () => ({ useRouter: () => ({}) }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

afterEach(() => vi.unstubAllGlobals())

it('saves None as a null Gmail label and displays the category fallback', async () => {
  const settings = {
    inboxScope: 'unread',
    inboxOrder: 'newest',
    inboxLabelId: 'Label_1',
  }
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/labels')
      return Response.json({ labels: [{ id: 'Label_1', name: 'Receipts' }] })
    if (url === '/api/settings/openai-key')
      return Response.json({ hasKey: true })
    if (url === '/api/settings') {
      return Response.json({
        settings:
          init?.method === 'POST'
            ? { ...settings, inboxLabelId: undefined }
            : settings,
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  })
  vi.stubGlobal('fetch', fetch)

  render(<SettingsClient />)
  const trigger = await screen.findByRole('combobox', {
    name: 'inbox.focusOnLabel',
  })
  await waitFor(() => expect(trigger).toHaveTextContent('Receipts'))
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  const list = await screen.findByRole('listbox')
  fireEvent.click(
    within(list).getByRole('option', { name: 'inbox.noneUseCategory' }),
  )
  await waitFor(() =>
    expect(trigger).toHaveTextContent('inbox.noneUseCategory'),
  )
  expect(fetch).toHaveBeenCalledWith(
    '/api/settings',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ inboxLabelId: null }),
    }),
  )
})
