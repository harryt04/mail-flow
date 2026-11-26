import { useState } from 'react'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { expect, it } from 'vitest'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './select'

it('opens by keyboard, chooses an option and restores focus after Escape', async () => {
  const items = ['Primary', 'Receipts']
  function Choices() {
    const [value, setValue] = useState<string | null>('Primary')
    return (
      <form aria-label="Settings">
        <Select items={items} value={value} onValueChange={setValue}>
          <SelectLabel>Focus on a label</SelectLabel>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </form>
    )
  }
  render(<Choices />)
  const trigger = screen.getByRole('combobox', { name: 'Focus on a label' })
  expect(trigger).toHaveTextContent('Primary')
  act(() => trigger.focus())
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  const list = await screen.findByRole('listbox')
  expect(screen.getByRole('form', { name: 'Settings' })).not.toContainElement(
    list,
  )
  const receipts = within(list).getByRole('option', { name: 'Receipts' })
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
  expect(receipts).toHaveAttribute('data-highlighted')
  fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
  await waitFor(() => expect(trigger).toHaveTextContent('Receipts'))
  await waitFor(() => expect(trigger).toHaveFocus())

  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  await screen.findByRole('listbox')
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  await waitFor(() =>
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument(),
  )
  expect(trigger).toHaveFocus()
  expect(trigger).toHaveTextContent('Receipts')
})
