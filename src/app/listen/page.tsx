import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth/options";
import { usersCollection } from "@/lib/db/collections";
import { AppHeader } from "@/components/ui/AppHeader";
import { ListenClient } from "@/app/listen/ListenClient";

export default async function ListenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const users = await usersCollection();
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  const initialPlaybackSpeed = user?.settings.playbackSpeed ?? 1;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <ListenClient initialPlaybackSpeed={initialPlaybackSpeed} />
    </div>
  );
}
