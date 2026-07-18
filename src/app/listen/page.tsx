import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/options";
import { AppHeader } from "@/components/ui/AppHeader";
import { ListenClient } from "@/app/listen/ListenClient";

export default async function ListenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <ListenClient />
    </div>
  );
}
