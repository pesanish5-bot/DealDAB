import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import {
  createAuthSession,
  createAuthUser,
  deleteAuthSession,
  findAuthUserByEmail,
  getAuthSessionUser,
  type PublicUser,
} from "./database";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE = "dealdab_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(180),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(180),
  password: z.string().min(1, "Enter your password.").max(128),
});

function sessionTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function passwordMatches(password: string, stored: string) {
  const [algorithm, salt, encoded] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function issueSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await createAuthSession({
    id: randomUUID(),
    userId,
    tokenHash: sessionTokenHash(token),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000),
  });
  return token;
}

export async function registerAccount(input: z.infer<typeof registerSchema>) {
  const user = await createAuthUser({
    id: randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash: await passwordHash(input.password),
    createdAt: new Date().toISOString(),
  });
  return { user, token: await issueSession(user.id) };
}

export async function loginAccount(input: z.infer<typeof loginSchema>) {
  const stored = await findAuthUserByEmail(input.email);
  if (!stored || !(await passwordMatches(input.password, stored.passwordHash))) return null;
  const user: PublicUser = { id: stored.id, name: stored.name, email: stored.email };
  return { user, token: await issueSession(user.id) };
}

export async function userFromSessionToken(token: string | undefined) {
  return token ? getAuthSessionUser(sessionTokenHash(token)) : null;
}

export async function revokeSessionToken(token: string | undefined) {
  if (token) await deleteAuthSession(sessionTokenHash(token));
}
