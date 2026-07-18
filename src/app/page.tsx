import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth/options";
import { Button } from "@/components/ui/Button";
import { IconGoogle } from "@/components/ui/icons";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/home");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-display font-bold text-text-primary">MailFlow</h1>
        <p className="max-w-sm text-body-lg text-text-secondary">
          The audiobook app for your inbox. Close your eyes, listen, and say a word.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/home" });
        }}
      >
        <Button type="submit" size="lg" icon={<IconGoogle className="w-5 h-5" />}>
          Sign in with Google
        </Button>
      </form>
    </main>
  );
}
