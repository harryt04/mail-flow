import { useState } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CategoryChecklist } from '@/components/settings/CategoryChecklist'
import { ToggleGroup } from '@/components/settings/ToggleGroup'

const options = [
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
]

it('moves focus with arrows and keeps exactly one pressed option', () => {
  const change = vi.fn()
  function Choices() {
    const [value, setValue] = useState('first')
    return (
      <ToggleGroup
        aria-label="Order"
        options={options}
        value={value}
        onChange={(next) => {
          change(next)
          setValue(next)
        }}
      />
    )
  }
  render(<Choices />)
  const group = within(screen.getByRole('group', { name: 'Order' }))
  const first = group.getByRole('button', { name: 'First', pressed: true })
  const second = group.getByRole('button', { name: 'Second', pressed: false })
  act(() => first.focus())
  fireEvent.keyDown(first, { key: 'ArrowRight' })
  expect(second).toHaveFocus()
  expect(first).toHaveAttribute('aria-pressed', 'true')

  fireEvent.click(second)
  fireEvent.click(second)
  expect(group.getAllByRole('button', { pressed: true })).toEqual([second])
  expect(change).toHaveBeenCalledExactlyOnceWith('second')
})

it.each(['single', 'multiple'])(
  'retains focus while saving a %s choice',
  (mode) => {
    const change = vi.fn()
    function Choices() {
      const [saving, setSaving] = useState(false)
      const [values, setValues] = useState(['first'])
      const save = (next: string[]) => {
        change(next)
        setValues(next)
        setSaving(true)
      }
      return mode === 'single' ? (
        <ToggleGroup
          aria-label="Choices"
          options={options}
          value={values[0]}
          onChange={(next) => save([next])}
          disabled={saving}
        />
      ) : (
        <CategoryChecklist
          aria-label="Choices"
          options={options}
          values={values}
          onChange={save}
          disabled={saving}
        />
      )
    }
    render(<Choices />)
    const second = screen.getByRole('button', { name: 'Second' })
    act(() => second.focus())
    fireEvent.click(second)
    expect(second).toHaveAttribute('aria-pressed', 'true')
    expect(second).toHaveAttribute('aria-disabled', 'true')
    expect(second).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'First' }))
    expect(change).toHaveBeenCalledOnce()
  },
)

it('selects multiple categories and removes one without affecting the others', () => {
  function Choices() {
    const [values, setValues] = useState(['first'])
    return (
      <CategoryChecklist
        aria-label="Categories"
        options={options}
        values={values}
        onChange={setValues}
      />
    )
  }
  render(<Choices />)
  const first = screen.getByRole('button', { name: 'First' })
  const second = screen.getByRole('button', { name: 'Second' })
  fireEvent.click(second)
  expect(screen.getAllByRole('button', { pressed: true })).toEqual([
    first,
    second,
  ])
  fireEvent.click(first)
  expect(screen.getAllByRole('button', { pressed: true })).toEqual([second])
})
