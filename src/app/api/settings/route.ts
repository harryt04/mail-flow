import { requireUser } from '@/lib/auth/requireUser'
import { usersCollection } from '@/lib/db/collections'
import {
  PLAYBACK_SPEEDS,
  type InboxScope,
  type InboxOrder,
  type ThemePreference,
  type InboxCategory,
} from '@/lib/types'

export async function GET() {
  const auth = await requireUser()
  if (!auth)
    return Response.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    )

  const users = await usersCollection()
  const user = await users.findOne({ _id: auth.userId })
  if (!user)
    return Response.json(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 },
    )

  return Response.json({ settings: user.settings })
}

const VALID_SCOPE: InboxScope[] = ['unread', 'all']
const VALID_ORDER: InboxOrder[] = ['oldest', 'newest']
const VALID_THEME: ThemePreference[] = ['system', 'light', 'dark']
const VALID_CATEGORY: InboxCategory[] = [
  'primary',
  'promotions',
  'social',
  'updates',
  'forums',
  'all',
]

export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth)
    return Response.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    )

  const body = await request.json().catch(() => null)
  const update: Record<string, unknown> = {}

  if (body?.inboxScope !== undefined) {
    if (!VALID_SCOPE.includes(body.inboxScope)) {
      return Response.json(
        { error: 'Invalid inboxScope', code: 'INVALID_INBOX_SCOPE' },
        { status: 400 },
      )
    }
    update['settings.inboxScope'] = body.inboxScope
  }
  if (body?.inboxOrder !== undefined) {
    if (!VALID_ORDER.includes(body.inboxOrder)) {
      return Response.json(
        { error: 'Invalid inboxOrder', code: 'INVALID_INBOX_ORDER' },
        { status: 400 },
      )
    }
    update['settings.inboxOrder'] = body.inboxOrder
  }
  if (body?.inboxCategory !== undefined) {
    if (!VALID_CATEGORY.includes(body.inboxCategory)) {
      return Response.json(
        { error: 'Invalid inboxCategory', code: 'INVALID_INBOX_CATEGORY' },
        { status: 400 },
      )
    }
    update['settings.inboxCategory'] = body.inboxCategory
  }
  if (body?.inboxLabelId !== undefined) {
    if (body.inboxLabelId !== null && typeof body.inboxLabelId !== 'string') {
      return Response.json(
        { error: 'Invalid inboxLabelId', code: 'INVALID_INBOX_LABEL_ID' },
        { status: 400 },
      )
    }
    update['settings.inboxLabelId'] = body.inboxLabelId
  }
  if (body?.autoSkipCategories !== undefined) {
    if (
      !Array.isArray(body.autoSkipCategories) ||
      !body.autoSkipCategories.every((c: unknown) =>
        VALID_CATEGORY.includes(c as InboxCategory),
      )
    ) {
      return Response.json(
        {
          error: 'Invalid autoSkipCategories',
          code: 'INVALID_AUTO_SKIP_CATEGORIES',
        },
        { status: 400 },
      )
    }
    update['settings.autoSkipCategories'] = body.autoSkipCategories
  }
  if (body?.theme !== undefined) {
    if (!VALID_THEME.includes(body.theme)) {
      return Response.json(
        { error: 'Invalid theme', code: 'INVALID_THEME' },
        { status: 400 },
      )
    }
    update['settings.theme'] = body.theme
  }
  if (body?.voiceTone !== undefined) {
    if (typeof body.voiceTone !== 'string') {
      return Response.json(
        { error: 'Invalid voiceTone', code: 'INVALID_VOICE_TONE' },
        { status: 400 },
      )
    }
    update['settings.voiceTone'] = body.voiceTone
  }
  if (body?.playbackSpeed !== undefined) {
    if (!(PLAYBACK_SPEEDS as readonly number[]).includes(body.playbackSpeed)) {
      return Response.json(
        { error: 'Invalid playbackSpeed', code: 'INVALID_PLAYBACK_SPEED' },
        { status: 400 },
      )
    }
    update['settings.playbackSpeed'] = body.playbackSpeed
  }

  if (Object.keys(update).length === 0) {
    return Response.json(
      { error: 'No valid fields to update', code: 'NO_VALID_FIELDS' },
      { status: 400 },
    )
  }
  update.updatedAt = new Date()

  const users = await usersCollection()
  const result = await users.findOneAndUpdate(
    { _id: auth.userId },
    { $set: update },
    { returnDocument: 'after' },
  )
  if (!result)
    return Response.json(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      { status: 404 },
    )

  return Response.json({ settings: result.settings })
}
