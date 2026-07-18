import { describe, expect, it } from 'vitest'
import type { gmail_v1 } from 'googleapis'
import { headerValue, parseGmailMessage, parseSenderHeader } from './parse'

function base64Url(text: string): string {
  return Buffer.from(text, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function message(
  overrides: Partial<gmail_v1.Schema$Message> = {},
): gmail_v1.Schema$Message {
  return {
    id: 'msg-1',
    threadId: 'thread-1',
    payload: {
      headers: [
        { name: 'From', value: 'Jane Doe <jane@example.com>' },
        { name: 'Subject', value: 'Hello there' },
      ],
      mimeType: 'text/plain',
      body: { data: base64Url('Hi,\n\nJust checking in.') },
    },
    ...overrides,
  }
}

describe('headerValue', () => {
  it('finds a header case-insensitively', () => {
    const headers = [{ name: 'Subject', value: 'Test' }]
    expect(headerValue(headers, 'subject')).toBe('Test')
  })

  it('returns empty string when header is missing', () => {
    expect(headerValue(undefined, 'Subject')).toBe('')
    expect(headerValue([], 'Subject')).toBe('')
  })
})

describe('parseSenderHeader', () => {
  it('parses "Name <email>" format', () => {
    expect(parseSenderHeader('Jane Doe <jane@example.com>')).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
    })
  })

  it('strips surrounding quotes from the name', () => {
    expect(parseSenderHeader('"Jane Doe" <jane@example.com>')).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
    })
  })

  it('falls back to the email when name is empty', () => {
    expect(parseSenderHeader('<jane@example.com>')).toEqual({
      name: 'jane@example.com',
      email: 'jane@example.com',
    })
  })

  it('handles a bare email with no angle brackets', () => {
    expect(parseSenderHeader('jane@example.com')).toEqual({
      name: 'jane@example.com',
      email: 'jane@example.com',
    })
  })
})

describe('parseGmailMessage', () => {
  it('extracts sender, subject, and body paragraphs from a plain-text message', () => {
    const result = parseGmailMessage(message())
    expect(result.messageId).toBe('msg-1')
    expect(result.threadId).toBe('thread-1')
    expect(result.sender).toBe('Jane Doe')
    expect(result.senderEmail).toBe('jane@example.com')
    expect(result.subject).toBe('Hello there')
    expect(result.paragraphs).toEqual(['Hi,', 'Just checking in.'])
  })

  it('falls back to "(no subject)" when Subject header is missing', () => {
    const result = parseGmailMessage(
      message({
        payload: {
          headers: [{ name: 'From', value: 'jane@example.com' }],
          mimeType: 'text/plain',
          body: { data: base64Url('Body text') },
        },
      }),
    )
    expect(result.subject).toBe('(no subject)')
  })

  it('strips quoted reply history after an "On ... wrote:" marker', () => {
    const result = parseGmailMessage(
      message({
        payload: {
          headers: [{ name: 'From', value: 'jane@example.com' }],
          mimeType: 'text/plain',
          body: {
            data: base64Url(
              'New reply text.\n\nOn Mon, Jan 1, 2024 at 1:00 PM John wrote:\n> old quoted text',
            ),
          },
        },
      }),
    )
    expect(result.paragraphs).toEqual(['New reply text.'])
  })

  it('humanizes URLs into "a link to <hostname>"', () => {
    const result = parseGmailMessage(
      message({
        payload: {
          headers: [{ name: 'From', value: 'jane@example.com' }],
          mimeType: 'text/plain',
          body: {
            data: base64Url('Check this out: https://www.example.com/path?x=1'),
          },
        },
      }),
    )
    expect(result.paragraphs).toEqual(['Check this out: a link to example.com'])
  })

  it('extracts and strips HTML when only an HTML part is present', () => {
    const result = parseGmailMessage(
      message({
        payload: {
          headers: [{ name: 'From', value: 'jane@example.com' }],
          mimeType: 'text/html',
          body: { data: base64Url('<p>Hello <b>world</b></p>') },
        },
      }),
    )
    expect(result.paragraphs).toEqual(['Hello world'])
  })

  it('does not fragment a paragraph wrapped in layout-only <div>s', () => {
    const result = parseGmailMessage(
      message({
        payload: {
          headers: [{ name: 'From', value: 'jane@example.com' }],
          mimeType: 'text/html',
          body: {
            data: base64Url(
              '<div><div><div>Hello world</div></div></div>\n<div><div>Second paragraph</div></div>',
            ),
          },
        },
      }),
    )
    expect(result.paragraphs).toEqual(['Hello world Second paragraph'])
  })

  it('recurses into multipart messages, preferring the text/plain part', () => {
    const result = parseGmailMessage(
      message({
        payload: {
          headers: [{ name: 'From', value: 'jane@example.com' }],
          mimeType: 'multipart/alternative',
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: base64Url('Plain version') },
            },
            {
              mimeType: 'text/html',
              body: { data: base64Url('<p>HTML version</p>') },
            },
          ],
        },
      }),
    )
    expect(result.paragraphs).toEqual(['Plain version'])
  })

  it('returns a placeholder paragraph when the body has no readable text', () => {
    const result = parseGmailMessage(
      message({
        payload: {
          headers: [{ name: 'From', value: 'jane@example.com' }],
        },
      }),
    )
    expect(result.paragraphs).toEqual(['This email has no readable body text.'])
  })
})
