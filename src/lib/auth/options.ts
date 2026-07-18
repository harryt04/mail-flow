import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { usersCollection, ensureIndexes } from "@/lib/db/collections";
import { encryptToken } from "@/lib/auth/tokenCrypto";
import { DEFAULT_USER_SETTINGS } from "@/lib/types";

const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ");

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: GMAIL_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    // Only responsible for the initial persist-on-signin. Ongoing token refresh
    // lives solely in lib/gmail/client.ts against the Mongo-stored tokens, so
    // there is exactly one place that owns refresh logic.
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const googleId = String(profile.sub);
        const email = String(profile.email ?? "");
        const name = String(profile.name ?? email);
        const image = typeof profile.picture === "string" ? profile.picture : undefined;

        if (!account.access_token || !account.refresh_token) {
          // Google only issues a refresh_token on the user's very first-ever
          // consent; access_type/prompt above force it, but guard anyway.
          throw new Error(
            "Google did not return a refresh token — user must revoke app access at https://myaccount.google.com/permissions and sign in again"
          );
        }

        await ensureIndexes();
        const users = await usersCollection();
        const expiryDate = (account.expires_at ?? 0) * 1000;

        const existing = await users.findOneAndUpdate(
          { googleId },
          {
            $set: {
              googleId,
              email,
              name,
              image,
              "gmailTokens.accessToken": encryptToken(account.access_token),
              "gmailTokens.refreshToken": encryptToken(account.refresh_token),
              "gmailTokens.expiryDate": expiryDate,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              settings: DEFAULT_USER_SETTINGS,
              createdAt: new Date(),
            },
          },
          { upsert: true, returnDocument: "after" }
        );

        token.dbUserId = existing?._id.toString();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.dbUserId) {
        session.user.id = token.dbUserId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
