import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createAgent } from '@ui-sdk/react/agent'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { allowAgentAction } from './policy'

it('only permits reviewed navigation and search edits, and redacts private fields', async () => {
  const agent = createAgent({ allow: allowAgentAction })
  const send = vi.fn()
  const navigate = vi.fn((event) => event.preventDefault())
  function Search() {
    const [value, setValue] = useState('')
    return (
      <Input
        aria-label="Search"
        data-agent-control="inbox-search"
        value={value}
        onValueChange={setValue}
      />
    )
  }
  render(
    <>
      <Search />
      <Button asChild data-agent-control="navigation">
        <a href="/inbox" onClick={navigate}>
          Inbox
        </a>
      </Button>
      <Button onClick={send}>Send</Button>
      <div data-agent-confirm="Change settings">
        <Input data-agent-control="inbox-search" aria-label="Setting" />
      </div>
      <Input
        aria-label="Key"
        data-agent-secret
        defaultValue="fixture-private-key"
      />
      <div data-agent-hidden>
        <Button>Fixture message body</Button>
      </div>
    </>,
  )
  const snapshot = JSON.stringify(agent.snapshot())
  expect(snapshot).not.toContain('fixture-private-key')
  expect(snapshot).not.toContain('Fixture message body')
  const run = (ref: string, action: string, args: string[] = []) =>
    agent.act({ steps: [{ ref, action, args }] })
  expect((await run('Search', 'setValue', ['June'])).ok).toBe(true)
  expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('June')
  expect((await run('Inbox', 'press')).ok).toBe(true)
  expect(navigate).toHaveBeenCalledOnce()
  expect((await run('Send', 'press')).ok).toBe(false)
  expect(send).not.toHaveBeenCalled()
  expect((await run('Setting', 'setValue', ['changed'])).ok).toBe(false)
})

it('denies SDK menu actions for authentication, settings, account and mail', async () => {
  const agent = createAgent({ allow: allowAgentAction })
  const select = vi.fn()
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild data-agent-control="navigation">
          <a href="/settings" onClick={select}>
            Settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={select} data-agent-confirm="Sign out">
          Sign out
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={select}>Change account</DropdownMenuItem>
        <DropdownMenuItem onSelect={select}>Archive message</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
  await screen.findByRole('menu')

  for (const name of [
    'Settings',
    'Sign out',
    'Change account',
    'Archive message',
  ]) {
    expect(screen.getByRole('menuitem', { name })).toBeVisible()
    expect(
      (await agent.act({ steps: [{ ref: name, action: 'press' }] })).ok,
    ).toBe(false)
  }
  expect(select).not.toHaveBeenCalled()
})
