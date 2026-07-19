import { describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))

vi.mock('@/lib/auth/options', () => ({
  auth: mockAuth,
}))

import { requireUser } from './requireUser'

describe('requireUser', () => {
  it('returns null when there is no session', async () => {
    mockAuth.mockResolvedValue(null)
    expect(await requireUser()).toBeNull()
  })

  it('returns null when the session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'a@example.com' } })
    expect(await requireUser()).toBeNull()
  })

  it('returns the authenticated user when the session has a user id', async () => {
    const id = new ObjectId().toString()
    mockAuth.mockResolvedValue({ user: { id, email: 'a@example.com' } })

    const result = await requireUser()

    expect(result).not.toBeNull()
    expect(result?.userId.toString()).toBe(id)
    expect(result?.email).toBe('a@example.com')
  })

  it('defaults email to an empty string when the session omits it', async () => {
    const id = new ObjectId().toString()
    mockAuth.mockResolvedValue({ user: { id } })

    const result = await requireUser()

    expect(result?.email).toBe('')
  })
})
