import { describe, expect, it, vi } from 'vitest'
import type { gmail_v1 } from 'googleapis'
import {
  buildInboxSnapshot,
  fetchMessageSummaries,
  searchMessages,
} from './list'

describe('buildInboxSnapshot', () => {
  it('includes CATEGORY_PERSONAL for category: primary with no labelId', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: 'm1' }, { id: 'm2' }],
              resultSizeEstimate: 2,
              nextPageToken: undefined,
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    const result = await buildInboxSnapshot(
      mockGmail,
      'all',
      'oldest',
      'primary',
      undefined,
    )

    expect(mockGmail.users.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({
        labelIds: expect.arrayContaining(['INBOX', 'CATEGORY_PERSONAL']),
      }),
    )
    // order: 'oldest' reverses the list
    expect(result.messageIds).toEqual(['m2', 'm1'])
  })

  it('includes CATEGORY_PROMOTIONS for category: promotions', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: 'm1' }],
              resultSizeEstimate: 1,
              nextPageToken: undefined,
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    await buildInboxSnapshot(
      mockGmail,
      'all',
      'oldest',
      'promotions',
      undefined,
    )

    expect(mockGmail.users.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({
        labelIds: expect.arrayContaining(['INBOX', 'CATEGORY_PROMOTIONS']),
      }),
    )
  })

  it('includes only INBOX for category: all', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: 'm1' }],
              resultSizeEstimate: 1,
              nextPageToken: undefined,
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    await buildInboxSnapshot(mockGmail, 'all', 'oldest', 'all', undefined)

    expect(mockGmail.users.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({
        labelIds: ['INBOX'],
      }),
    )
  })

  it('uses labelId over category when both are provided', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: 'm1' }],
              resultSizeEstimate: 1,
              nextPageToken: undefined,
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    await buildInboxSnapshot(mockGmail, 'all', 'oldest', 'primary', 'Label_123')

    const call = (
      mockGmail.users.messages.list as unknown as Record<string, unknown>
    ).mock.calls[0][0] as Record<string, unknown>
    expect(call.labelIds).toContain('Label_123')
    expect(call.labelIds).not.toContain('CATEGORY_PERSONAL')
  })

  it('includes is:unread query for scope: unread', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: 'm1' }],
              resultSizeEstimate: 1,
              nextPageToken: undefined,
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    await buildInboxSnapshot(
      mockGmail,
      'unread',
      'oldest',
      'primary',
      undefined,
    )

    expect(mockGmail.users.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'is:unread',
      }),
    )
  })

  it('does not include query for scope: all', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: 'm1' }],
              resultSizeEstimate: 1,
              nextPageToken: undefined,
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    await buildInboxSnapshot(mockGmail, 'all', 'oldest', 'primary', undefined)

    expect(mockGmail.users.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: undefined,
      }),
    )
  })

  it('reverses messageIds for order: oldest', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
              resultSizeEstimate: 3,
              nextPageToken: undefined,
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    const result = await buildInboxSnapshot(
      mockGmail,
      'all',
      'oldest',
      'primary',
      undefined,
    )

    expect(result.messageIds).toEqual(['m3', 'm2', 'm1'])
  })

  it('does not reverse messageIds for order: newest', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
              resultSizeEstimate: 3,
              nextPageToken: undefined,
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    const result = await buildInboxSnapshot(
      mockGmail,
      'all',
      'newest',
      'primary',
      undefined,
    )

    expect(result.messageIds).toEqual(['m1', 'm2', 'm3'])
  })
})

describe('fetchMessageSummaries', () => {
  it('fetches and parses message summaries with headers and metadata', async () => {
    const mockGmail = {
      users: {
        messages: {
          get: vi
            .fn()
            .mockResolvedValueOnce({
              data: {
                id: 'm1',
                payload: {
                  headers: [
                    { name: 'From', value: 'Jane Doe <jane@example.com>' },
                    { name: 'Subject', value: 'Hello' },
                  ],
                },
                snippet: 'This is a snippet',
                internalDate: '1700000000000',
                labelIds: ['INBOX', 'UNREAD'],
              },
            })
            .mockResolvedValueOnce({
              data: {
                id: 'm2',
                payload: {
                  headers: [
                    { name: 'From', value: 'John Smith <john@example.com>' },
                    { name: 'Subject', value: 'Meeting' },
                  ],
                },
                snippet: 'Another snippet',
                internalDate: '1700000001000',
                labelIds: ['INBOX'],
              },
            }),
        },
      },
    } as unknown as gmail_v1.Gmail

    const result = await fetchMessageSummaries(mockGmail, ['m1', 'm2'])

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      messageId: 'm1',
      sender: 'Jane Doe',
      senderEmail: 'jane@example.com',
      subject: 'Hello',
      snippet: 'This is a snippet',
      unread: true,
    })
    expect(result[1]).toMatchObject({
      messageId: 'm2',
      sender: 'John Smith',
      senderEmail: 'john@example.com',
      subject: 'Meeting',
      snippet: 'Another snippet',
      unread: false,
    })
  })

  it('falls back to "(no subject)" when Subject header is missing', async () => {
    const mockGmail = {
      users: {
        messages: {
          get: vi.fn().mockResolvedValue({
            data: {
              id: 'm1',
              payload: {
                headers: [{ name: 'From', value: 'jane@example.com' }],
              },
              snippet: '',
              internalDate: '1700000000000',
              labelIds: [],
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    const result = await fetchMessageSummaries(mockGmail, ['m1'])

    expect(result[0].subject).toBe('(no subject)')
  })
})

describe('searchMessages', () => {
  it('searches with query and category, then hydrates summaries', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: 'm1' }, { id: 'm2' }],
              resultSizeEstimate: 2,
              nextPageToken: 'page_token_123',
            },
          }),
          get: vi
            .fn()
            .mockResolvedValueOnce({
              data: {
                id: 'm1',
                payload: {
                  headers: [
                    { name: 'From', value: 'Jane <jane@example.com>' },
                    { name: 'Subject', value: 'Test 1' },
                  ],
                },
                snippet: 'snippet 1',
                internalDate: '1700000000000',
                labelIds: ['INBOX'],
              },
            })
            .mockResolvedValueOnce({
              data: {
                id: 'm2',
                payload: {
                  headers: [
                    { name: 'From', value: 'John <john@example.com>' },
                    { name: 'Subject', value: 'Test 2' },
                  ],
                },
                snippet: 'snippet 2',
                internalDate: '1700000001000',
                labelIds: ['INBOX'],
              },
            }),
        },
      },
    } as unknown as gmail_v1.Gmail

    const result = await searchMessages(
      mockGmail,
      'from:jane@example.com',
      'promotions',
      undefined,
    )

    expect(mockGmail.users.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'from:jane@example.com',
        labelIds: expect.arrayContaining(['INBOX', 'CATEGORY_PROMOTIONS']),
        maxResults: 25,
      }),
    )
    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      messageId: 'm1',
      sender: 'Jane',
      subject: 'Test 1',
    })
    expect(result.items[1]).toMatchObject({
      messageId: 'm2',
      sender: 'John',
      subject: 'Test 2',
    })
    expect(result.nextPageToken).toBe('page_token_123')
  })

  it('passes through pageToken if provided', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [],
              resultSizeEstimate: 0,
              nextPageToken: undefined,
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    await searchMessages(mockGmail, 'is:unread', 'all', 'previous_page_token')

    expect(mockGmail.users.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({
        pageToken: 'previous_page_token',
      }),
    )
  })

  it('does not add category label for category: all', async () => {
    const mockGmail = {
      users: {
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [],
              resultSizeEstimate: 0,
              nextPageToken: undefined,
            },
          }),
        },
      },
    } as unknown as gmail_v1.Gmail

    await searchMessages(mockGmail, 'test', 'all', undefined)

    expect(mockGmail.users.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({
        labelIds: ['INBOX'],
      }),
    )
  })
})
