import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { renderWithIntl } from '@/test/renderWithIntl'
import { ManualControls } from './ManualControls'

function renderControls(
  overrides: Partial<Parameters<typeof ManualControls>[0]> = {},
) {
  const handlers = {
    onSkip: vi.fn(),
    onArchive: vi.fn(),
    onReply: vi.fn(),
    onMove: vi.fn(),
  }
  renderWithIntl(
    <TooltipProvider>
      <ManualControls {...handlers} {...overrides} />
    </TooltipProvider>,
  )
  return handlers
}

describe('ManualControls', () => {
  it('renders the core action buttons', () => {
    renderControls()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Move to folder' }),
    ).toBeInTheDocument()
  })

  it('does not render the continue button by default', () => {
    renderControls()
    expect(
      screen.queryByRole('button', { name: 'Continue Reading' }),
    ).not.toBeInTheDocument()
  })

  it('renders the continue button when showContinue and onContinue are provided', () => {
    renderControls({ showContinue: true, onContinue: vi.fn() })
    expect(
      screen.getByRole('button', { name: 'Continue Reading' }),
    ).toBeInTheDocument()
  })

  it('fires the corresponding handler for each button', () => {
    const handlers = renderControls()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move to folder' }))

    expect(handlers.onSkip).toHaveBeenCalledTimes(1)
    expect(handlers.onArchive).toHaveBeenCalledTimes(1)
    expect(handlers.onReply).toHaveBeenCalledTimes(1)
    expect(handlers.onMove).toHaveBeenCalledTimes(1)
  })

  it('disables all buttons when disabled is true', () => {
    renderControls({ disabled: true })
    expect(screen.getByRole('button', { name: 'Skip' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled()
  })
})
