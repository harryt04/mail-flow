"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconCheck } from "@/components/ui/icons";

interface EmailSummaryItem {
  messageId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
}

interface InboxPage {
  active: boolean;
  sessionId?: string;
  items?: EmailSummaryItem[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalEstimate?: number;
  cursorIndex?: number;
}

const PAGE_SIZE = 25;

export function InboxClient() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [data, setData] = useState<InboxPage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jumpingId, setJumpingId] = useState<string | null>(null);
  const [jumpError, setJumpError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/inbox?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load your inbox");
        return res.json();
      })
      .then((payload: InboxPage) => {
        setData(payload);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load your inbox"));
  }, [page]);

  async function handleStartHere(messageId: string) {
    if (!data?.sessionId || jumpingId) return;
    setJumpingId(messageId);
    setJumpError(null);
    try {
      const res = await fetch("/api/inbox/jump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: data.sessionId, messageId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not jump to that email");
      }
      router.push("/listen");
    } catch (err) {
      setJumpError(err instanceof Error ? err.message : "Could not jump to that email");
      setJumpingId(null);
    }
  }

  if (loadError) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-body text-danger">{loadError}</p>
        <Link href="/home">
          <Button variant="secondary">Back home</Button>
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-body text-text-secondary">Loading your inbox…</p>
      </main>
    );
  }

  if (!data.active) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-h1 font-semibold text-text-primary">No active session yet.</p>
        <p className="text-body text-text-secondary">
          Start listening once to build your inbox snapshot, then come back here to browse it.
        </p>
        <Link href="/home">
          <Button variant="secondary">Back home</Button>
        </Link>
      </main>
    );
  }

  const { items = [], total = 0, totalEstimate = total, cursorIndex = -1, pageSize = PAGE_SIZE } = data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const capNote =
    totalEstimate > total
      ? ` (the oldest ${total.toLocaleString()} of ~${totalEstimate.toLocaleString()} unread)`
      : "";

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10 gap-6 max-w-2xl mx-auto w-full">
      <div className="w-full flex flex-col gap-1">
        <h1 className="text-h1 font-bold text-text-primary">Inbox</h1>
        <p className="text-body text-text-secondary">
          {total.toLocaleString()} emails in this session{capNote}. Pick one to jump straight there.
        </p>
      </div>

      {jumpError && <p className="w-full text-body text-danger">{jumpError}</p>}

      <div className="w-full flex flex-col gap-3">
        {items.map((item, i) => {
          const isCurrent = page * pageSize + i === cursorIndex;
          return (
            <Card key={item.messageId} className="w-full flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-body-lg font-semibold text-text-primary truncate">
                      {item.sender}
                    </p>
                    {isCurrent && (
                      <Badge tone="attention" icon={<IconCheck className="w-4 h-4" />}>
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-body text-text-secondary truncate">{item.subject}</p>
                  <p className="text-meta text-text-muted truncate">{item.snippet}</p>
                </div>
                <Button
                  variant={isCurrent ? "secondary" : "primary"}
                  onClick={() => handleStartHere(item.messageId)}
                  disabled={jumpingId !== null}
                >
                  {jumpingId === item.messageId ? "Starting…" : "Start here"}
                </Button>
              </div>
            </Card>
          );
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
    </main>
  );
}
