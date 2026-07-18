import type { Collection, Db } from "mongodb";
import getMongoClient from "@/lib/db/client";
import type {
  UserDoc,
  ListeningSessionDoc,
  BookmarkDoc,
  EmailActionLogDoc,
} from "@/lib/types";

const DB_NAME = process.env.MONGODB_DB || "mailflow";

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(DB_NAME);
}

export async function usersCollection(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}

export async function sessionsCollection(): Promise<Collection<ListeningSessionDoc>> {
  return (await getDb()).collection<ListeningSessionDoc>("sessions");
}

export async function bookmarksCollection(): Promise<Collection<BookmarkDoc>> {
  return (await getDb()).collection<BookmarkDoc>("bookmarks");
}

export async function emailActionLogsCollection(): Promise<
  Collection<EmailActionLogDoc>
> {
  return (await getDb()).collection<EmailActionLogDoc>("emailActionLogs");
}

let indexesEnsured: Promise<void> | null = null;

/** Idempotent — safe to call on every cold start. `createIndex` is a no-op if the index already exists. */
export function ensureIndexes(): Promise<void> {
  if (!indexesEnsured) {
    indexesEnsured = (async () => {
      const [users, sessions, bookmarks, logs] = await Promise.all([
        usersCollection(),
        sessionsCollection(),
        bookmarksCollection(),
        emailActionLogsCollection(),
      ]);

      await Promise.all([
        users.createIndex({ googleId: 1 }, { unique: true }),
        users.createIndex({ email: 1 }, { unique: true }),
        sessions.createIndex({ userId: 1, status: 1 }),
        bookmarks.createIndex({ userId: 1 }, { unique: true }),
        logs.createIndex({ userId: 1, timestamp: 1 }),
      ]);
    })();
  }
  return indexesEnsured;
}
