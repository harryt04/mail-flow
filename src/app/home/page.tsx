import { redirect } from "next/navigation";
import Link from "next/link";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth/options";
import { getActiveSessionProgress } from "@/lib/bookmark/session";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const progress = await getActiveSessionProgress(new ObjectId(session.user.id));
  const bookmarkStatus = progress
    ? `You have ${progress.remaining} email${progress.remaining === 1 ? "" : "s"} left in this session.`
    : "Fresh inbox — ready to start.";

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <p className="text-body text-text-secondary">{bookmarkStatus}</p>
        <Link href="/listen">
          <Button size="lg">Start Listening</Button>
        </Link>
      </main>
    </div>
  );
}
