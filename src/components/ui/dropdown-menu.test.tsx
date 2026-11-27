import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

it('opens by keyboard, stops at the last item and restores trigger focus on Escape', async () => {
  render(
    <form>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button>Profile</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <a href="/settings">Settings</a>
          </DropdownMenuItem>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </form>,
  )

  const trigger = screen.getByRole('button', { name: 'Profile' })
  trigger.focus()
  expect(trigger).toHaveFocus()
  expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  const menu = await screen.findByRole('menu')
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(menu.parentElement).toBe(document.body)
  const items = within(menu)
  expect(items.getByText('Account')).toBeVisible()
  const settings = items.getByRole('menuitem', { name: 'Settings' })
  expect(settings.tagName).toBe('A')
  expect(settings).toHaveAttribute('href', '/settings')
  await waitFor(() => expect(settings).toHaveFocus())
  fireEvent.keyDown(settings, { key: 'ArrowDown' })
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
  expect(items.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  await waitFor(() =>
    expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
  )
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(trigger).toHaveFocus()
})

it('exposes all checkbox states and selects a mixed item without closing', async () => {
  const change = vi.fn()
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>View</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem checked>Checked</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={false}>
          Unchecked
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked="indeterminate"
          onCheckedChange={(checked) => change(checked)}
        >
          Mixed
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  )

  const trigger = screen.getByRole('button', { name: 'View' })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  const menu = within(await screen.findByRole('menu'))
  const checked = menu.getByRole('menuitemcheckbox', { name: 'Checked' })
  const unchecked = menu.getByRole('menuitemcheckbox', { name: 'Unchecked' })
  const mixed = menu.getByRole('menuitemcheckbox', { name: 'Mixed' })
  expect(checked).toHaveAttribute('aria-checked', 'true')
  expect(unchecked).toHaveAttribute('aria-checked', 'false')
  expect(mixed).toHaveAttribute('aria-checked', 'mixed')
  expect(mixed.querySelector('.lucide-minus')).toBeVisible()
  await waitFor(() => expect(checked).toHaveFocus())
  fireEvent.keyDown(checked, { key: 'End' })
  fireEvent.keyDown(mixed, { key: 'Enter' })
  expect(change).toHaveBeenCalledExactlyOnceWith(true)
  expect(mixed).toHaveFocus()
  fireEvent.click(mixed)
  expect(change).toHaveBeenCalledTimes(2)
  expect(change).toHaveBeenLastCalledWith(true)
  expect(screen.getByRole('menu')).toBeVisible()
})

it('selects only one radio value and keeps the menu open', async () => {
  const change = vi.fn()
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>Layout</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup defaultValue="wide" onValueChange={change}>
          <DropdownMenuLabel>Width</DropdownMenuLabel>
          <DropdownMenuRadioItem value="wide">Wide</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="narrow">Narrow</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Layout' }))
  const menu = await screen.findByRole('menu')
  const group = within(menu).getByRole('group', { name: 'Width' })
  const wide = within(group).getByRole('menuitemradio', { name: 'Wide' })
  const narrow = within(group).getByRole('menuitemradio', { name: 'Narrow' })
  expect(wide).toHaveAttribute('aria-checked', 'true')
  expect(narrow).toHaveAttribute('aria-checked', 'false')
  fireEvent.click(narrow)
  expect(change).toHaveBeenCalledWith('narrow', expect.anything())
  expect(wide).toHaveAttribute('aria-checked', 'false')
  expect(narrow).toHaveAttribute('aria-checked', 'true')
  expect(menu).toBeVisible()
})
