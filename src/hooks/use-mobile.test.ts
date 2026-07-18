import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIsMobile } from './use-mobile'

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: query.includes('max-width: 767') && window.innerWidth < 768,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  it('returns false when window width is >= 768px', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 800 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true when window width is < 768px', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 400 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })
})
