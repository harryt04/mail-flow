import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { usersCollection } from "@/lib/db/collections";
import { getGmailClientForUser } from "@/lib/gmail/client";
import {
  getOrCreateActiveSession,
  getActiveSessionProgress,
  buildCheckpointResponse,
} from "@/lib/bookmark/session";

/** Status only — does not build a snapshot. Used by /home to show "N emails left" without side effects. */
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const progress = await getActiveSessionProgress(auth.userId);
  if (!progress) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    remaining: progress.remaining,
    scope: progress.session.scope,
    order: progress.session.order,
  });
}

/** Get-or-create the active listening session and return the current email to play. */
export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await usersCollection();
  const user = await users.findOne({ _id: auth.userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { gmail } = await getGmailClientForUser(auth.userId.toString());
  const progress = await getOrCreateActiveSession(
    gmail,
    auth.userId,
    user.settings.inboxScope,
    user.settings.inboxOrder
  );

  const payload = await buildCheckpointResponse(gmail, progress);
  return NextResponse.json(payload);
}
