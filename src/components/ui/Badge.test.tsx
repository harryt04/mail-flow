import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders its label text', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('applies tone classes', () => {
    render(<Badge tone="danger">Failed</Badge>)
    expect(screen.getByText('Failed')).toHaveClass('text-danger')
  })

  it('defaults to the neutral tone', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('text-text-secondary')
  })

  it('renders an accompanying icon alongside the label', () => {
    render(<Badge icon={<span data-testid="badge-icon" />}>Attention</Badge>)
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument()
  })
  it('prepends the icon inside a slotted link', () => {
    render(
      <Badge
        asChild
        icon={<span aria-hidden="true" data-testid="badge-icon" />}
      >
        <a href="#new">New</a>
      </Badge>,
    )
    const link = screen.getByRole('link', { name: 'New' })
    expect(link).toHaveAttribute('href', '#new')
    expect(link).toHaveAttribute('data-slot', 'badge')
    expect(link.firstChild).toBe(screen.getByTestId('badge-icon'))
    expect(link.lastChild?.textContent).toBe('New')
  })
})
