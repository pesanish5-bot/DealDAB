import { mkdir } from "node:fs/promises";
import path from "node:path";
import { MongoClient, type Db } from "mongodb";
import type {
  Business,
  NegotiationResult,
  NegotiationSession,
  Offer,
  Recommendation,
  RequestInput,
} from "./types";

type StoredRequest = RequestInput & { id: string; createdAt: string };
export type DatabaseMode = "atlas" | "embedded" | "memory";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type AuthSession = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: Date;
};

export type PublicUser = Pick<AuthUser, "id" | "name" | "email">;

export class DatabaseConflictError extends Error {}

type MongoState = {
  client: MongoClient;
  db: Db;
  mode: Exclude<DatabaseMode, "memory">;
  server?: { stop: () => Promise<boolean> };
};

declare global {
  // eslint-disable-next-line no-var
  var __dealdabMongoPromise: Promise<MongoState> | undefined;
  // eslint-disable-next-line no-var
  var __dealdabMemory: MemoryState | undefined;
}

type MemoryState = {
  requests: Map<string, StoredRequest>;
  businesses: Map<string, Business>;
  sessions: Map<string, NegotiationSession>;
  offers: Map<string, Offer>;
  recommendations: Map<string, Recommendation>;
  users: Map<string, AuthUser>;
  authSessions: Map<string, AuthSession>;
};

function memoryState(): MemoryState {
  globalThis.__dealdabMemory ??= {
    requests: new Map(),
    businesses: new Map(),
    sessions: new Map(),
    offers: new Map(),
    recommendations: new Map(),
    users: new Map(),
    authSessions: new Map(),
  };
  return globalThis.__dealdabMemory;
}

async function connectMongo(): Promise<MongoState> {
  const configuredUri = process.env.MONGODB_URI?.trim();
  if (configuredUri) {
    const client = new MongoClient(configuredUri, { serverSelectionTimeoutMS: 5_000 });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "dealdab");
    await ensureIndexes(db);
    return { client, db, mode: "atlas" };
  }

  if (process.env.VERCEL) {
    throw new Error("Set MONGODB_URI for the hosted DealDAB deployment. Embedded MongoDB cannot run on serverless.");
  }

  const dbPath = path.join(process.cwd(), ".data", "mongodb");
  await mkdir(dbPath, { recursive: true });
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const server = await MongoMemoryServer.create({
    instance: { dbName: "dealdab", dbPath, storageEngine: "wiredTiger" },
  });
  const client = new MongoClient(server.getUri(), { serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  const db = client.db("dealdab");
  await ensureIndexes(db);
  return { client, db, mode: "embedded", server };
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("negotiationSessions").createIndex({ requestId: 1, businessId: 1 }),
    db.collection("offers").createIndex({ requestId: 1, businessId: 1 }, { unique: true }),
    db.collection("recommendations").createIndex({ requestId: 1 }, { unique: true }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("authSessions").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("authSessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

async function mongoState(): Promise<MongoState> {
  globalThis.__dealdabMongoPromise ??= connectMongo();
  return globalThis.__dealdabMongoPromise;
}

async function withMongo<T>(
  operation: (state: MongoState) => Promise<T>,
  fallback: (state: MemoryState) => T | Promise<T>,
): Promise<{ value: T; mode: DatabaseMode }> {
  try {
    const state = await mongoState();
    return { value: await operation(state), mode: state.mode };
  } catch (error) {
    if (error instanceof DatabaseConflictError) throw error;
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      throw new DatabaseConflictError("An account with this email already exists.");
    }
    console.error("MongoDB unavailable; using explicit degraded memory mode", error);
    globalThis.__dealdabMongoPromise = undefined;
    return { value: await fallback(memoryState()), mode: "memory" };
  }
}

export async function createAuthUser(user: AuthUser): Promise<PublicUser> {
  const result = await withMongo(
    async ({ db }) => {
      const existing = await db.collection<AuthUser>("users").findOne({ email: user.email });
      if (existing) throw new DatabaseConflictError("An account with this email already exists.");
      await db.collection<AuthUser>("users").insertOne(user);
      return { id: user.id, name: user.name, email: user.email };
    },
    (memory) => {
      if (memory.users.has(user.email)) throw new DatabaseConflictError("An account with this email already exists.");
      memory.users.set(user.email, user);
      return { id: user.id, name: user.name, email: user.email };
    },
  );
  return result.value;
}

export async function findAuthUserByEmail(email: string): Promise<AuthUser | null> {
  const result = await withMongo(
    ({ db }) => db.collection<AuthUser>("users").findOne({ email }, { projection: { _id: 0 } }),
    (memory) => memory.users.get(email) ?? null,
  );
  return result.value;
}

export async function createAuthSession(session: AuthSession): Promise<void> {
  await withMongo(
    async ({ db }) => void await db.collection<AuthSession>("authSessions").insertOne(session),
    (memory) => void memory.authSessions.set(session.tokenHash, session),
  );
}

export async function getAuthSessionUser(tokenHash: string): Promise<PublicUser | null> {
  const result = await withMongo(
    async ({ db }) => {
      const session = await db.collection<AuthSession>("authSessions").findOne({ tokenHash, expiresAt: { $gt: new Date() } });
      if (!session) return null;
      const user = await db.collection<AuthUser>("users").findOne({ id: session.userId }, { projection: { _id: 0, passwordHash: 0 } });
      return user ? { id: user.id, name: user.name, email: user.email } : null;
    },
    (memory) => {
      const session = memory.authSessions.get(tokenHash);
      if (!session || session.expiresAt <= new Date()) return null;
      const user = [...memory.users.values()].find((candidate) => candidate.id === session.userId);
      return user ? { id: user.id, name: user.name, email: user.email } : null;
    },
  );
  return result.value;
}

export async function deleteAuthSession(tokenHash: string): Promise<void> {
  await withMongo(
    async ({ db }) => void await db.collection<AuthSession>("authSessions").deleteOne({ tokenHash }),
    (memory) => void memory.authSessions.delete(tokenHash),
  );
}

export async function saveRequest(request: StoredRequest): Promise<DatabaseMode> {
  const result = await withMongo(
    async ({ db }) => {
      await db.collection<StoredRequest>("requests").replaceOne({ id: request.id }, request, { upsert: true });
    },
    (memory) => void memory.requests.set(request.id, request),
  );
  return result.mode;
}

export async function getRequest(id: string): Promise<{ request: StoredRequest | null; mode: DatabaseMode }> {
  const result = await withMongo(
    ({ db }) => db.collection<StoredRequest>("requests").findOne({ id }, { projection: { _id: 0 } }),
    (memory) => memory.requests.get(id) ?? null,
  );
  return { request: result.value, mode: result.mode };
}

export async function saveNegotiation(result: NegotiationResult): Promise<DatabaseMode> {
  const stored = await withMongo(
    async ({ db }) => {
      const operations = [
        ...result.businesses.map((business) =>
          db.collection<Business>("businesses").replaceOne({ id: business.id }, business, { upsert: true }),
        ),
        ...result.sessions.map((session) =>
          db.collection<NegotiationSession>("negotiationSessions").replaceOne({ id: session.id }, session, { upsert: true }),
        ),
        ...result.offers.map((offer) =>
          db.collection<Offer>("offers").replaceOne(
            { requestId: offer.requestId, businessId: offer.businessId },
            offer,
            { upsert: true },
          ),
        ),
        db.collection<Recommendation>("recommendations").replaceOne(
          { requestId: result.request.id },
          result.recommendation,
          { upsert: true },
        ),
      ];
      await Promise.all(operations);
    },
    (memory) => {
      result.businesses.forEach((value) => memory.businesses.set(value.id, value));
      result.sessions.forEach((value) => memory.sessions.set(value.id, value));
      result.offers.forEach((value) => memory.offers.set(`${value.requestId}:${value.businessId}`, value));
      memory.recommendations.set(result.request.id, result.recommendation);
    },
  );
  return stored.mode;
}

export async function getNegotiationBundle(
  requestId: string,
): Promise<{ result: NegotiationResult | null; mode: DatabaseMode }> {
  const requestLookup = await getRequest(requestId);
  if (!requestLookup.request) return { result: null, mode: requestLookup.mode };
  const result = await withMongo(
    async ({ db }) => {
      const [businesses, sessions, offers, recommendation] = await Promise.all([
        db.collection<Business>("businesses").find({}, { projection: { _id: 0 } }).toArray(),
        db.collection<NegotiationSession>("negotiationSessions").find({ requestId }, { projection: { _id: 0 } }).toArray(),
        db.collection<Offer>("offers").find({ requestId }, { projection: { _id: 0 } }).toArray(),
        db.collection<Recommendation>("recommendations").findOne({ requestId }, { projection: { _id: 0 } }),
      ]);
      if (!recommendation) return null;
      return { businesses, sessions, offers, recommendation };
    },
    (memory) => {
      const sessions = [...memory.sessions.values()].filter((session) => session.requestId === requestId);
      const offers = [...memory.offers.values()].filter((offer) => offer.requestId === requestId);
      const recommendation = memory.recommendations.get(requestId);
      if (!recommendation) return null;
      return { businesses: [...memory.businesses.values()], sessions, offers, recommendation };
    },
  );
  return {
    result: result.value
      ? {
          request: requestLookup.request,
          ...result.value,
          databaseMode: result.mode,
        }
      : null,
    mode: result.mode,
  };
}

export async function getDatabaseHealth(): Promise<{ mode: DatabaseMode; ok: boolean }> {
  const result = await withMongo(
    async ({ db }) => {
      await db.command({ ping: 1 });
      return true;
    },
    () => false,
  );
  return { mode: result.mode, ok: result.value };
}
