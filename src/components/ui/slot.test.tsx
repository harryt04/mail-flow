import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expect, it, vi } from 'vitest'
import { Slot } from './slot'

it('merges child props, styles, classes, handlers and React 19 refs', () => {
  const slotRef = createRef<HTMLElement>()
  const childRef = vi.fn()
  const calls: string[] = []
  const { unmount } = render(
    <Slot
      ref={slotRef}
      aria-label="Shortcut"
      title="Slot title"
      className="rounded-md p-2"
      style={{ color: 'red', padding: '4px' }}
      onClick={() => calls.push('slot')}
    >
      <a
        ref={childRef}
        href="#shortcut"
        title="Child title"
        className="p-4 font-bold"
        style={{ color: 'blue' }}
        onClick={() => calls.push('child')}
      >
        Go
      </a>
    </Slot>,
  )
  const link = screen.getByRole('link', { name: 'Shortcut' })
  expect(link).toHaveAttribute('href', '#shortcut')
  expect(link).toHaveAttribute('title', 'Child title')
  expect(link).toHaveTextContent('Go')
  expect(link).toHaveClass('p-4', 'rounded-md', 'font-bold')
  expect(link).not.toHaveClass('p-2')
  expect(link).toHaveStyle({ color: 'rgb(0, 0, 255)', padding: '4px' })
  expect(slotRef.current).toBe(link)
  expect(childRef).toHaveBeenCalledWith(link)
  fireEvent.click(link)
  expect(calls).toEqual(['child', 'slot'])
  unmount()
  expect(slotRef.current).toBeNull()
  expect(childRef).toHaveBeenLastCalledWith(null)
})

it('skips the slot handler when the child prevents the default action', () => {
  const slotClick = vi.fn()
  render(
    <Slot onClick={slotClick}>
      <button onClick={(event) => event.preventDefault()}>Cancel</button>
    </Slot>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(slotClick).not.toHaveBeenCalled()
})
