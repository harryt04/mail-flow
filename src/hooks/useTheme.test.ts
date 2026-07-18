import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'

const STORAGE_KEY = 'mailflow-theme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
  })

  it('defaults to system preference when localStorage is empty', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.preference).toBe('system')
  })

  it('restores the stored preference on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.preference).toBe('dark')
  })

  it('sets the data-theme attribute when switching to a manual override', () => {
    const { result } = renderHook(() => useTheme())
    act(() => {
      result.current.setTheme('light')
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light')
  })

  it('clears the data-theme attribute and localStorage when switching back to system', () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    const { result } = renderHook(() => useTheme())
    act(() => {
      result.current.setTheme('system')
    })
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
