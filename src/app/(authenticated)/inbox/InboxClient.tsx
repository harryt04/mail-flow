'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { IconCheck } from '@/components/ui/icons'

interface EmailSummaryItem {
  messageId: string
  sender: string
  senderEmail: string
  subject: string
  snippet: string
  receivedAt: string
  unread: boolean
}

interface InboxPageResponse {
  active: boolean
  sessionId?: string
  items?: EmailSummaryItem[]
  page?: number
  pageSize?: number
  total?: number
  totalEstimate?: number
  cursorIndex?: number
  nextPageToken?: string
}

const PAGE_SIZE = 25

/**
 * Format a timestamp (epoch-ms string) as a relative time string.
 * Returns "Just now", "Xm ago", "Xh ago", "Xd ago" for recent messages,
 * or a short absolute date like "Jan 5" for older messages.
 */
function formatRelativeTime(dateMs: number): string {
  const now = Date.now()
  const diff = now - dateMs
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`

  // For older messages, show short absolute date
  const date = new Date(dateMs)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function InboxClient() {
  const router = useRouter()

  // Accumulated items and session state
  const [items, setItems] = useState<EmailSummaryItem[]>([])
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [cursorIndex, setCursorIndex] = useState(-1)
  const [total, setTotal] = useState(0)
  const [totalEstimate, setTotalEstimate] = useState(0)
  const [active, setActive] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Infinite scroll state
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(
    undefined,
  )

  // Search state
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const searchDebounceTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Debounce search input
  useEffect(() => {
    if (searchDebounceTimerRef.current)
      clearTimeout(searchDebounceTimerRef.current)
    const timer = setTimeout(() => setSearchTerm(searchInput), 400)
    searchDebounceTimerRef.current = timer
    return () => clearTimeout(timer)
  }, [searchInput])

  // Reset and fetch on search term change
  useEffect(() => {
    const fetchData = async () => {
      setItems([])
      setNextPageToken(undefined)
      setHasMore(true)
      setLoadError(null)
      setLoadingMore(true)
      try {
        const url = new URL('/api/inbox', window.location.origin)
        if (searchTerm) {
          url.searchParams.set('search', searchTerm)
          // pageToken defaults to empty string on first load
        } else {
          url.searchParams.set('page', '0')
          url.searchParams.set('pageSize', String(PAGE_SIZE))
        }

        const res = await fetch(url.toString())
        if (!res.ok) throw new Error('Could not load your inbox')
        const payload: InboxPageResponse = await res.json()

        setItems(payload.items ?? [])
        setSessionId(payload.sessionId)
        setCursorIndex(payload.cursorIndex ?? -1)
        setActive(payload.active ?? false)

        if (searchTerm) {
          // Search mode: no total, use nextPageToken
          setTotal(0)
          setTotalEstimate(0)
          setNextPageToken(payload.nextPageToken)
          setHasMore(Boolean(payload.nextPageToken))
        } else {
          // Snapshot mode: use total, no nextPageToken
          const fetchedTotal = payload.total ?? 0
          setTotal(fetchedTotal)
          setTotalEstimate(payload.totalEstimate ?? fetchedTotal)
          setNextPageToken(undefined)
          const fetchedItems = payload.items ?? []
          setHasMore(fetchedItems.length < fetchedTotal)
        }

        setLoadError(null)
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : 'Could not load your inbox',
        )
        setHasMore(false)
      } finally {
        setLoadingMore(false)
      }
    }

    fetchData()
  }, [searchTerm])

  // Fetch more items on infinite scroll
  const fetchMore = async () => {
    if (loadingMore || !hasMore || !active) return

    setLoadingMore(true)
    try {
      const url = new URL('/api/inbox', window.location.origin)

      if (searchTerm) {
        url.searchParams.set('search', searchTerm)
        if (nextPageToken) {
          url.searchParams.set('pageToken', nextPageToken)
        }
      } else {
        // Snapshot mode: compute page from current items
        const currentPage = Math.floor(items.length / PAGE_SIZE)
        url.searchParams.set('page', String(currentPage))
        url.searchParams.set('pageSize', String(PAGE_SIZE))
      }

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Could not load more emails')
      const payload: InboxPageResponse = await res.json()

      const newItems = payload.items ?? []
      setItems((prev) => [...prev, ...newItems])
      setSessionId(payload.sessionId)
      setCursorIndex(payload.cursorIndex ?? -1)

      if (searchTerm) {
        // Search mode
        setNextPageToken(payload.nextPageToken)
        setHasMore(Boolean(payload.nextPageToken))
      } else {
        // Snapshot mode
        const fetchedTotal = payload.total ?? 0
        setTotal(fetchedTotal)
        setTotalEstimate(payload.totalEstimate ?? fetchedTotal)
        setHasMore(items.length + newItems.length < fetchedTotal)
      }

      setLoadError(null)
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Could not load more emails',
      )
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }

  // Infinite scroll observer — re-attaches whenever the sentinel's presence or
  // the fetch-guard state changes, so it (a) picks up the sentinel once it
  // actually mounts (it doesn't exist during the initial "active === null"
  // loading state) and (b) never runs on stale hasMore/loadingMore closures.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchMore()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hasMore, loadingMore, searchTerm, items.length])

  const [jumpingId, setJumpingId] = useState<string | null>(null)
  const [jumpError, setJumpError] = useState<string | null>(null)

  async function handleStartHere(messageId: string) {
    if (!sessionId || jumpingId) return
    setJumpingId(messageId)
    setJumpError(null)
    try {
      const res = await fetch('/api/inbox/jump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messageId }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Could not jump to that email')
      }
      router.push('/listen')
    } catch (err) {
      setJumpError(
        err instanceof Error ? err.message : 'Could not jump to that email',
      )
      setJumpingId(null)
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-body text-danger">{loadError}</p>
        <Link href="/home">
          <Button variant="secondary">Back home</Button>
        </Link>
      </div>
    )
  }

  if (active === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-body text-text-secondary">Loading your inbox…</p>
      </div>
    )
  }

  if (!active) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-h1 text-text-primary font-semibold">
          No active session yet.
        </p>
        <p className="text-body text-text-secondary">
          Start listening once to build your inbox snapshot, then come back here
          to browse it.
        </p>
        <Link href="/home">
          <Button variant="secondary">Back home</Button>
        </Link>
      </div>
    )
  }

  const capNote =
    totalEstimate > total
      ? ` (the oldest ${total.toLocaleString()} of ~${totalEstimate.toLocaleString()} unread)`
      : ''

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-1">
          <h1 className="text-h1 text-text-primary font-bold">Inbox</h1>
          <p className="text-body text-text-secondary">
            {total.toLocaleString()} emails to listen to{capNote}. Pick one to
            jump straight there.
          </p>
        </div>
        <input
          type="text"
          placeholder="Search your inbox…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="rounded-card border-border bg-surface-sunken text-body text-text-primary w-full border p-3"
        />
      </div>

      {jumpError && <p className="text-body text-danger w-full">{jumpError}</p>}

      <div className="flex w-full flex-col gap-3">
        {items.map((item, i) => {
          const isCurrent = i === cursorIndex
          const relativeTime = formatRelativeTime(Number(item.receivedAt))
          return (
            <Card key={item.messageId} className="flex w-full flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body-lg text-text-primary truncate font-semibold">
                      {item.sender}
                    </p>
                    {item.unread && <Badge tone="brand">Unread</Badge>}
                    {isCurrent && (
                      <Badge
                        tone="attention"
                        icon={<IconCheck className="h-4 w-4" />}
                      >
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-meta text-text-muted truncate">
                    {item.senderEmail}
                  </p>
                  <p className="text-body text-text-secondary truncate">
                    {item.subject}
                  </p>
                  <p className="text-meta text-text-muted truncate">
                    {item.snippet}
                  </p>
                  <p className="text-meta text-text-muted">{relativeTime}</p>
                </div>
                <Button
                  className="shrink-0 whitespace-nowrap"
                  variant={isCurrent ? 'secondary' : 'primary'}
                  onClick={() => handleStartHere(item.messageId)}
                  disabled={jumpingId !== null}
                >
                  {jumpingId === item.messageId ? 'Starting…' : 'Start here'}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <div ref={sentinelRef} className="w-full" />

      {loadingMore && (
        <p className="text-body text-text-secondary">Loading more…</p>
      )}
      {!hasMore && items.length > 0 && (
        <p className="text-body text-text-muted">That&apos;s everything</p>
      )}
    </div>
  )
}
