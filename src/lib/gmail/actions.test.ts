import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { gmail_v1 } from 'googleapis'
import {
  archiveMessage,
  markMessageAsRead,
  moveMessageToLabel,
  sendReply,
} from './actions'

function makeGmail() {
  return {
    users: {
      messages: {
        modify: vi.fn().mockResolvedValue({}),
        get: vi.fn(),
        send: vi.fn().mockResolvedValue({}),
      },
    },
  } as unknown as gmail_v1.Gmail
}

describe('gmail actions', () => {
  let gmail: gmail_v1.Gmail

  beforeEach(() => {
    gmail = makeGmail()
  })

  it('markMessageAsRead removes the UNREAD label', async () => {
    await markMessageAsRead(gmail, 'msg-1')

    expect(gmail.users.messages.modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'msg-1',
      requestBody: { removeLabelIds: ['UNREAD'] },
    })
  })

  it('archiveMessage removes the INBOX label', async () => {
    await archiveMessage(gmail, 'msg-1')

    expect(gmail.users.messages.modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'msg-1',
      requestBody: { removeLabelIds: ['INBOX'] },
    })
  })

  it('moveMessageToLabel adds the label and removes INBOX', async () => {
    await moveMessageToLabel(gmail, 'msg-1', 'Label_123')

    expect(gmail.users.messages.modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'msg-1',
      requestBody: { addLabelIds: ['Label_123'], removeLabelIds: ['INBOX'] },
    })
  })

  describe('sendReply', () => {
    it('threads the reply using the original Message-Id and References headers', async () => {
      ;(gmail.users.messages.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          data: {
            payload: {
              headers: [
                { name: 'Message-Id', value: '<original@mail.example.com>' },
                { name: 'References', value: '<earlier@mail.example.com>' },
              ],
            },
          },
        },
      )

      await sendReply({
        gmail,
        threadId: 'thread-1',
        originalMessageId: 'msg-1',
        toEmail: 'sender@example.com',
        fromEmail: 'me@example.com',
        subject: 'Hello',
        bodyText: 'Thanks!',
      })

      expect(gmail.users.messages.send).toHaveBeenCalledTimes(1)
      const call = (gmail.users.messages.send as ReturnType<typeof vi.fn>).mock
        .calls[0][0]
      expect(call.userId).toBe('me')
      expect(call.requestBody.threadId).toBe('thread-1')

      const decoded = Buffer.from(
        call.requestBody.raw.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      ).toString('utf-8')

      expect(decoded).toContain('Subject: Re: Hello')
      expect(decoded).toContain('In-Reply-To: <original@mail.example.com>')
      expect(decoded).toContain(
        'References: <earlier@mail.example.com> <original@mail.example.com>',
      )
      expect(decoded).toContain('Thanks!')
    })

    it('does not double-prefix a subject that already starts with Re:', async () => {
      ;(gmail.users.messages.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        { data: { payload: { headers: [] } } },
      )

      await sendReply({
        gmail,
        threadId: 'thread-1',
        originalMessageId: 'msg-1',
        toEmail: 'sender@example.com',
        fromEmail: 'me@example.com',
        subject: 'Re: Hello',
        bodyText: 'Thanks!',
      })

      const call = (gmail.users.messages.send as ReturnType<typeof vi.fn>).mock
        .calls[0][0]
      const decoded = Buffer.from(
        call.requestBody.raw.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      ).toString('utf-8')

      expect(decoded).toContain('Subject: Re: Hello')
      expect(decoded).not.toContain('Re: Re:')
    })

    it('omits In-Reply-To/References when the original message has no matching headers', async () => {
      ;(gmail.users.messages.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        { data: { payload: { headers: [] } } },
      )

      await sendReply({
        gmail,
        threadId: 'thread-1',
        originalMessageId: 'msg-1',
        toEmail: 'sender@example.com',
        fromEmail: 'me@example.com',
        subject: 'Hello',
        bodyText: 'Thanks!',
      })

      const call = (gmail.users.messages.send as ReturnType<typeof vi.fn>).mock
        .calls[0][0]
      const decoded = Buffer.from(
        call.requestBody.raw.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      ).toString('utf-8')

      expect(decoded).not.toContain('In-Reply-To:')
      expect(decoded).not.toContain('References:')
    })
  })
})
