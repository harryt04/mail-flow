import { requireUser } from "@/lib/auth/requireUser";
import { usersCollection } from "@/lib/db/collections";
import type { InboxScope, InboxOrder, ThemePreference } from "@/lib/types";

export async function GET() {
  const auth = await requireUser();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const users = await usersCollection();
  const user = await users.findOne({ _id: auth.userId });
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  return Response.json({ settings: user.settings });
}

const VALID_SCOPE: InboxScope[] = ["unread", "all"];
const VALID_ORDER: InboxOrder[] = ["oldest", "newest"];
const VALID_THEME: ThemePreference[] = ["system", "light", "dark"];

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const update: Record<string, unknown> = {};

  if (body?.inboxScope !== undefined) {
    if (!VALID_SCOPE.includes(body.inboxScope)) {
      return Response.json({ error: "Invalid inboxScope" }, { status: 400 });
    }
    update["settings.inboxScope"] = body.inboxScope;
  }
  if (body?.inboxOrder !== undefined) {
    if (!VALID_ORDER.includes(body.inboxOrder)) {
      return Response.json({ error: "Invalid inboxOrder" }, { status: 400 });
    }
    update["settings.inboxOrder"] = body.inboxOrder;
  }
  if (body?.theme !== undefined) {
    if (!VALID_THEME.includes(body.theme)) {
      return Response.json({ error: "Invalid theme" }, { status: 400 });
    }
    update["settings.theme"] = body.theme;
  }
  if (body?.voiceTone !== undefined) {
    if (typeof body.voiceTone !== "string") {
      return Response.json({ error: "Invalid voiceTone" }, { status: 400 });
    }
    update["settings.voiceTone"] = body.voiceTone;
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }
  update.updatedAt = new Date();

  const users = await usersCollection();
  const result = await users.findOneAndUpdate(
    { _id: auth.userId },
    { $set: update },
    { returnDocument: "after" }
  );
  if (!result) return Response.json({ error: "User not found" }, { status: 404 });

  return Response.json({ settings: result.settings });
}
