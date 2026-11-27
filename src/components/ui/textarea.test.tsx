import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Textarea } from './textarea'

it('propagates edits through the controlled value callback', () => {
  function Draft() {
    const [value, setValue] = useState('Initial draft')
    return (
      <Textarea
        aria-label="Reply"
        value={value}
        onValueChange={(next) => setValue(next.toUpperCase())}
      />
    )
  }
  render(<Draft />)
  const field = screen.getByRole('textbox', { name: 'Reply' })
  expect(field).toHaveValue('Initial draft')
  fireEvent.input(field, { target: { value: 'Updated draft' } })
  expect(field).toHaveValue('UPDATED DRAFT')
})
