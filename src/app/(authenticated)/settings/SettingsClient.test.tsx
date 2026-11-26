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

it('keeps the label picker focusable and unchangeable while a choice saves', async () => {
  let finishSave: (response: Response) => void = () => {}
  const settings = { inboxScope: 'unread', inboxOrder: 'newest' }
  const fetch = vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/labels')
      return Promise.resolve(
        Response.json({ labels: [{ id: 'Label_1', name: 'Receipts' }] }),
      )
    if (url === '/api/settings/openai-key')
      return Promise.resolve(Response.json({ hasKey: true }))
    if (url === '/api/settings' && init?.method === 'POST')
      return new Promise<Response>((resolve) => (finishSave = resolve))
    if (url === '/api/settings')
      return Promise.resolve(Response.json({ settings }))
    throw new Error(`Unexpected request: ${url}`)
  })
  vi.stubGlobal('fetch', fetch)

  render(<SettingsClient />)
  const trigger = await screen.findByRole('combobox', {
    name: 'inbox.focusOnLabel',
  })
  await screen.findByText('inbox.noneUseCategory')
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  const list = await screen.findByRole('listbox')
  fireEvent.click(within(list).getByRole('option', { name: 'Receipts' }))

  await waitFor(() => expect(trigger).toHaveAttribute('aria-readonly', 'true'))
  expect(trigger).not.toBeDisabled()
  expect(trigger).toHaveFocus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  const reopened = screen.queryByRole('listbox')
  if (reopened)
    fireEvent.click(
      within(reopened).getByRole('option', { name: 'inbox.noneUseCategory' }),
    )
  // No second save request: read-only refused the change.
  expect(fetch).toHaveBeenCalledTimes(4)

  finishSave(
    Response.json({ settings: { ...settings, inboxLabelId: 'Label_1' } }),
  )
  await waitFor(() =>
    expect(trigger).not.toHaveAttribute('aria-readonly', 'true'),
  )
  expect(trigger).toHaveTextContent('Receipts')
})
