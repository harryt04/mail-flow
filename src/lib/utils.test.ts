import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('resolves conflicting tailwind utility classes, keeping the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('resolves conflicts between the app-specific text-size tokens', () => {
    expect(cn('text-h1', 'text-body-lg')).toBe('text-body-lg')
  })

  it('resolves conflicts between the app-specific text-color tokens', () => {
    expect(cn('text-on-accent', 'text-primary')).toBe('text-primary')
  })

  it('keeps size and color tokens independent of each other', () => {
    expect(cn('text-on-accent', 'text-body-lg')).toBe(
      'text-on-accent text-body-lg',
    )
  })
})
