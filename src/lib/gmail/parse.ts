import type { gmail_v1 } from "googleapis";
import type { ParsedEmail } from "@/lib/types";

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf-8"
  );
}

interface ExtractedBody {
  text?: string;
  html?: string;
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): ExtractedBody {
  if (!payload) return {};

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return { text: decodeBase64Url(payload.body.data) };
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return { html: decodeBase64Url(payload.body.data) };
  }

  if (payload.parts) {
    let text: string | undefined;
    let html: string | undefined;
    for (const part of payload.parts) {
      const extracted = extractBody(part);
      text = text ?? extracted.text;
      html = html ?? extracted.html;
    }
    return { text, html };
  }

  return {};
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Cuts the message off at the first quoted-reply/signature marker so we don't read prior thread history aloud. */
function stripQuotedReplies(text: string): string {
  const patterns = [
    /\n\s*On .{0,120} wrote:\s*\n/i,
    /\n-{2,}\s*Original Message\s*-{2,}/i,
    /\n>.*(\n>.*)*/,
  ];
  let cut = text.length;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && typeof match.index === "number" && match.index < cut) {
      cut = match.index;
    }
  }
  return text.slice(0, cut).trim();
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim())
    .filter((p) => p.length > 0);
}

function headerValue(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseSenderHeader(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    const name = match[1].replace(/"/g, "").trim();
    return { name: name || match[2], email: match[2].trim() };
  }
  return { name: raw.trim(), email: raw.trim() };
}

export function parseGmailMessage(message: gmail_v1.Schema$Message): ParsedEmail {
  const headers = message.payload?.headers;
  const fromRaw = headerValue(headers, "From");
  const subject = headerValue(headers, "Subject") || "(no subject)";
  const { name: sender, email: senderEmail } = parseSenderHeader(fromRaw);

  const { text, html } = extractBody(message.payload);
  const rawText = text ?? (html ? stripHtml(html) : "");
  const withoutQuotes = stripQuotedReplies(rawText);
  const paragraphs = splitParagraphs(withoutQuotes);

  return {
    messageId: message.id ?? "",
    threadId: message.threadId ?? "",
    sender,
    senderEmail,
    subject,
    paragraphs: paragraphs.length > 0 ? paragraphs : ["This email has no readable body text."],
  };
}
