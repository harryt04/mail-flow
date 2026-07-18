'use client'

import { useCallback, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'mailflow-theme'

function applyTheme(pref: ThemePreference) {
  if (pref === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', pref)
  }
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

/** `prefers-color-scheme` drives the default; a manual override persists via `data-theme` (BRAND.md §3.4). */
export function useTheme() {
  const [preference, setPreference] =
    useState<ThemePreference>(readStoredPreference)

  const setTheme = useCallback((pref: ThemePreference) => {
    setPreference(pref)
    applyTheme(pref)
    if (pref === 'system') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, pref)
    }
  }, [])

  return { preference, setTheme }
}
