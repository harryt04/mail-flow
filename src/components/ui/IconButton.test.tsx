import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('exposes the label as an accessible name', () => {
    render(<IconButton icon={<span />} label="Archive" />)
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()
  })

  it('also sets the label as a title attribute', () => {
    render(<IconButton icon={<span />} label="Archive" />)
    expect(screen.getByRole('button', { name: 'Archive' })).toHaveAttribute(
      'title',
      'Archive',
    )
  })

  it('fires onClick when clicked', () => {
    const onClick = vi.fn()
    render(<IconButton icon={<span />} label="Skip" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders the provided icon', () => {
    render(
      <IconButton icon={<span data-testid="icon-content" />} label="Reply" />,
    )
    expect(screen.getByTestId('icon-content')).toBeInTheDocument()
  })
})
