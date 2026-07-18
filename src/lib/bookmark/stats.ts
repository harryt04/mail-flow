import type { ObjectId } from 'mongodb'
import { emailActionLogsCollection } from '@/lib/db/collections'
import type { EmailAction } from '@/lib/types'

export interface ActionCounts {
  skip: number
  archive: number
  delete: number
  reply: number
  snooze: number
  move: number
  total: number
}

const ZERO_COUNTS: Omit<ActionCounts, 'total'> = {
  skip: 0,
  archive: 0,
  delete: 0,
  reply: 0,
  snooze: 0,
  move: 0,
}

/** All-time per-action tallies for a user's processed emails, for the /home confidence-boost dashboard. */
export async function getActionCounts(userId: ObjectId): Promise<ActionCounts> {
  const logs = await emailActionLogsCollection()
  const results = await logs
    .aggregate<{ _id: EmailAction; count: number }>([
      { $match: { userId } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
    ])
    .toArray()

  const counts: ActionCounts = { ...ZERO_COUNTS, total: 0 }
  for (const { _id: action, count } of results) {
    counts[action] = count
    counts.total += count
  }
  return counts
}
