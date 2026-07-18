import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusIndicator } from './StatusIndicator'

describe('StatusIndicator', () => {
  it('renders the provided label text', () => {
    render(<StatusIndicator state="idle" label="Idle" />)
    expect(screen.getByText('Idle')).toBeInTheDocument()
  })

  it.each([
    ['speaking'],
    ['listening'],
    ['thinking'],
    ['confirmed'],
    ['error'],
    ['idle'],
  ] as const)('renders without crashing for state "%s"', (state) => {
    render(<StatusIndicator state={state} label={state} />)
    expect(screen.getByText(state)).toBeInTheDocument()
  })
})
