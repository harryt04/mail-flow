import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getGmailClientForUser } from "@/lib/gmail/client";
import { listUserLabels } from "@/lib/gmail/labels";

/** The user's Gmail labels, for the "Move to" folder picker. */
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gmail } = await getGmailClientForUser(auth.userId.toString());
  const labels = await listUserLabels(gmail);
  return NextResponse.json({ labels });
}
