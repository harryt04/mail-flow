import type { gmail_v1 } from 'googleapis'

export async function markMessageAsRead(
  gmail: gmail_v1.Gmail,
  messageId: string,
): Promise<void> {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { removeLabelIds: ['UNREAD'] },
  })
}

export async function archiveMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
): Promise<void> {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { removeLabelIds: ['INBOX'] },
  })
}

/** Sorts the message into a user label (e.g. "Unsubscribe") — applies the label AND archives it, so it drops out of the sequential listening queue but stays findable under that label in Gmail. */
export async function moveMessageToLabel(
  gmail: gmail_v1.Gmail,
  messageId: string,
  labelId: string,
): Promise<void> {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { addLabelIds: [labelId], removeLabelIds: ['INBOX'] },
  })
}

interface SendReplyParams {
  gmail: gmail_v1.Gmail
  threadId: string
  originalMessageId: string
  toEmail: string
  fromEmail: string
  subject: string
  bodyText: string
}

/** Sends a properly in-thread reply: correct `threadId` plus `In-Reply-To`/`References` headers. */
export async function sendReply({
  gmail,
  threadId,
  originalMessageId,
  toEmail,
  fromEmail,
  subject,
  bodyText,
}: SendReplyParams): Promise<void> {
  const original = await gmail.users.messages.get({
    userId: 'me',
    id: originalMessageId,
    format: 'metadata',
    metadataHeaders: ['Message-Id', 'References'],
  })

  const headers = original.data.payload?.headers ?? []
  const originalRfcMessageId =
    headers.find((h) => h.name?.toLowerCase() === 'message-id')?.value ?? ''
  const originalReferences =
    headers.find((h) => h.name?.toLowerCase() === 'references')?.value ?? ''
  const references = [originalReferences, originalRfcMessageId]
    .filter(Boolean)
    .join(' ')

  const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`

  const headerLines = [
    `From: ${fromEmail}`,
    `To: ${toEmail}`,
    `Subject: ${replySubject}`,
    originalRfcMessageId ? `In-Reply-To: ${originalRfcMessageId}` : null,
    references ? `References: ${references}` : null,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
  ].filter((line): line is string => line !== null)

  const rawMessage = `${headerLines.join('\r\n')}\r\n\r\n${bodyText}`

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      threadId,
    },
  })
}
