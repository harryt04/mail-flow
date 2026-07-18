import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireUser } from "@/lib/auth/requireUser";
import { getGmailClientForUser } from "@/lib/gmail/client";
import { advanceSession, buildCheckpointResponse } from "@/lib/bookmark/session";

/** "Skip"/"Next" — no Gmail side effect, just advances the bookmark. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const sessionId = body?.sessionId;
  const messageId = body?.messageId;
  if (typeof sessionId !== "string" || typeof messageId !== "string") {
    return NextResponse.json(
      { error: "sessionId and messageId are required" },
      { status: 400 }
    );
  }

  const { gmail } = await getGmailClientForUser(auth.userId.toString());
  const progress = await advanceSession(
    auth.userId,
    new ObjectId(sessionId),
    messageId,
    "skip"
  );
  const payload = await buildCheckpointResponse(gmail, progress);
  return NextResponse.json(payload);
}
