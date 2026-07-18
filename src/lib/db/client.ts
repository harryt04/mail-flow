import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  return new MongoClient(uri).connect();
}

/**
 * Lazily created (not at module-load time) so `next build`'s page-data
 * collection doesn't require DB env vars to be set. Cached on `global` so
 * the connection survives dev HMR reloads and warm serverless invocations.
 */
export default function getMongoClient(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  return global._mongoClientPromise;
}
