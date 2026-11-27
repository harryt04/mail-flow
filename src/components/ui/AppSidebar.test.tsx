import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { signOutAction } from '@/lib/auth/actions'
import { AppSidebar } from './AppSidebar'
import { SidebarProvider } from './sidebar'

vi.mock('next/navigation', () => ({ usePathname: () => '/home' }))
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Test User' } } }),
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('@/lib/auth/actions', () => ({
  signOutAction: vi.fn(async () => {}),
}))

it('submits the sign-out server action by keyboard and pointer', async () => {
  render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
  )

  const trigger = screen.getByRole('button', { name: /Test User/ })
  expect(trigger).toHaveAttribute('data-sidebar', 'menu-button')
  expect(trigger.closest('[data-agent-hidden]')).toBeInTheDocument()
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  const menu = await screen.findByRole('menu')
  expect(menu).toHaveAttribute('data-agent-hidden')
  const settings = within(menu).getByRole('menuitem', { name: 'settings' })
  expect(settings.tagName).toBe('A')
  expect(settings).toHaveAttribute('href', '/settings')
  const signOut = within(menu).getByRole('menuitem', { name: 'signOut' })
  expect(signOut).toHaveAttribute('data-agent-confirm', 'Sign out')
  expect(signOut.closest('form')).toBeNull()
  await waitFor(() => expect(settings).toHaveFocus())
  fireEvent.keyDown(settings, { key: 'ArrowDown' })
  expect(signOut).toHaveFocus()
  fireEvent.keyDown(signOut, { key: 'Enter' })
  await waitFor(() => expect(signOutAction).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(trigger).toHaveFocus())

  fireEvent.click(trigger)
  const reopened = await screen.findByRole('menu')
  fireEvent.click(within(reopened).getByRole('menuitem', { name: 'signOut' }))
  await waitFor(() => expect(signOutAction).toHaveBeenCalledTimes(2))
})
