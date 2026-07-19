import type { useTranslations } from 'next-intl'

interface ApiErrorPayload {
  error?: string
  code?: string
}

/**
 * Prefers the stable `code` (translated via the `apiErrors` namespace) over
 * the raw `error` string an API route returns, so error messages stay
 * locale-aware without every route needing to be locale-aware itself.
 */
export function translateApiError(
  t: ReturnType<typeof useTranslations<'apiErrors'>>,
  payload: ApiErrorPayload | null | undefined,
  fallback: string,
): string {
  if (payload?.code && t.has(payload.code as never)) {
    return t(payload.code as never)
  }
  return payload?.error ?? fallback
}
