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
};

function memoryState(): MemoryState {
  globalThis.__dealdabMemory ??= {
    requests: new Map(),
    businesses: new Map(),
    sessions: new Map(),
    offers: new Map(),
    recommendations: new Map(),
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
    console.error("MongoDB unavailable; using explicit degraded memory mode", error);
    globalThis.__dealdabMongoPromise = undefined;
    return { value: await fallback(memoryState()), mode: "memory" };
  }
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
