import { signIn } from "@/lib/auth/options";
import { Button } from "@/components/ui/Button";
import { IconGoogle } from "@/components/ui/icons";

/** Shared sign-in action, used by both the hero and the closing CTA. */
export function GoogleSignInForm() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/home" });
      }}
    >
      <Button type="submit" size="lg" variant="google" icon={<IconGoogle className="w-5 h-5" />}>
        Sign in with Google
      </Button>
    </form>
  );
}
