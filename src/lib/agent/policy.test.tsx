import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createAgent } from '@ui-sdk/react/agent'
import { Button } from '@/components/ui/Button'
import { ToggleGroup } from '@/components/settings/ToggleGroup'
import {
  Select,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
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

it('refuses settings toggle, select and key actions without changing their values', async () => {
  const allow = vi.fn(allowAgentAction)
  const agent = createAgent({ allow })
  const toggle = vi.fn()
  const select = vi.fn()
  const editKey = vi.fn()
  render(
    <>
      <ToggleGroup
        aria-label="Inbox order"
        value="newest"
        options={[
          { value: 'newest', label: 'Newest first' },
          { value: 'oldest', label: 'Oldest first' },
        ]}
        onChange={toggle}
      />
      <Select
        items={['Primary', 'Receipts']}
        value="Primary"
        onValueChange={select}
      >
        <SelectLabel>Focus on a label</SelectLabel>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Primary">Primary</SelectItem>
          <SelectItem value="Receipts">Receipts</SelectItem>
        </SelectContent>
      </Select>
      <Input
        aria-label="OpenAI key"
        type="password"
        data-agent-secret
        value="fixture-secret-key"
        onValueChange={editKey}
      />
    </>,
  )

  for (const step of [
    { ref: 'Oldest first', action: 'setPressed', args: [true] },
    { ref: 'Focus on a label', action: 'setValue', args: ['Receipts'] },
    { ref: 'OpenAI key', action: 'setValue', args: ['replacement'] },
  ]) {
    expect((await agent.act({ steps: [step] })).ok).toBe(false)
  }

  expect(allow.mock.calls.map(([step]) => step.component)).toEqual([
    'toggle',
    'select',
    'input',
  ])
  expect(toggle).not.toHaveBeenCalled()
  expect(select).not.toHaveBeenCalled()
  expect(editKey).not.toHaveBeenCalled()
  expect(
    screen.getByRole('button', { name: 'Newest first', pressed: true }),
  ).toBeVisible()
  expect(
    screen.getByRole('combobox', { name: 'Focus on a label' }),
  ).toHaveTextContent('Primary')
  expect(screen.getByLabelText('OpenAI key')).toHaveValue('fixture-secret-key')
  const snapshot = agent.snapshot()
  expect(snapshot).toContainEqual(
    expect.objectContaining({ label: 'OpenAI key', value: '[redacted]' }),
  )
  expect(JSON.stringify(snapshot)).not.toContain('fixture-secret-key')
})
