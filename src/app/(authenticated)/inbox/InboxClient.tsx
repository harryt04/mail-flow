'use client'

import { useEffect, useState } from 'react'
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
}

interface InboxPage {
  active: boolean
  sessionId?: string
  items?: EmailSummaryItem[]
  page?: number
  pageSize?: number
  total?: number
  totalEstimate?: number
  cursorIndex?: number
}

const PAGE_SIZE = 25

export function InboxClient() {
  const router = useRouter()
  const [page, setPage] = useState(0)
  const [data, setData] = useState<InboxPage | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [jumpingId, setJumpingId] = useState<string | null>(null)
  const [jumpError, setJumpError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/inbox?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load your inbox')
        return res.json()
      })
      .then((payload: InboxPage) => {
        setData(payload)
        setLoadError(null)
      })
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : 'Could not load your inbox',
        ),
      )
  }, [page])

  async function handleStartHere(messageId: string) {
    if (!data?.sessionId || jumpingId) return
    setJumpingId(messageId)
    setJumpError(null)
    try {
      const res = await fetch('/api/inbox/jump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.sessionId, messageId }),
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

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-body text-text-secondary">Loading your inbox…</p>
      </div>
    )
  }

  if (!data.active) {
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

  const {
    items = [],
    total = 0,
    totalEstimate = total,
    cursorIndex = -1,
    pageSize = PAGE_SIZE,
  } = data
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const capNote =
    totalEstimate > total
      ? ` (the oldest ${total.toLocaleString()} of ~${totalEstimate.toLocaleString()} unread)`
      : ''

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="flex w-full flex-col gap-1">
        <h1 className="text-h1 text-text-primary font-bold">Inbox</h1>
        <p className="text-body text-text-secondary">
          {total.toLocaleString()} emails in this session{capNote}. Pick one to
          jump straight there.
        </p>
      </div>

      {jumpError && <p className="text-body text-danger w-full">{jumpError}</p>}

      <div className="flex w-full flex-col gap-3">
        {items.map((item, i) => {
          const isCurrent = page * pageSize + i === cursorIndex
          return (
            <Card key={item.messageId} className="flex w-full flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body-lg text-text-primary truncate font-semibold">
                      {item.sender}
                    </p>
                    {isCurrent && (
                      <Badge
                        tone="attention"
                        icon={<IconCheck className="h-4 w-4" />}
                      >
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-body text-text-secondary truncate">
                    {item.subject}
                  </p>
                  <p className="text-meta text-text-muted truncate">
                    {item.snippet}
                  </p>
                </div>
                <Button
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

      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </Button>
        <p className="text-meta text-text-muted whitespace-nowrap">
          Page {page + 1} of {totalPages}
        </p>
        <Button
          variant="secondary"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
