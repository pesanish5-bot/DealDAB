import { randomUUID } from "node:crypto";
import { demoBusinesses } from "./demo-data";
import { negotiateWithBusiness } from "./negotiation";
import { scoreOffers } from "./scoring";
import type { NegotiationResult, RequestInput } from "./types";

export function createRequestDocument(input: RequestInput) {
  return { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
}

export function runNegotiations(
  request: RequestInput & { id: string; createdAt: string },
  businesses = demoBusinesses,
): NegotiationResult {
  const attempts = businesses.map((business) => negotiateWithBusiness(request.id, request, business));
  const sessions = attempts.map((attempt) => attempt.session);
  const rawOffers = attempts.flatMap((attempt) => (attempt.offer ? [attempt.offer] : []));
  const { offers, recommendation } = scoreOffers(rawOffers, request);
  return {
    request,
    businesses,
    sessions,
    offers,
    recommendation,
    databaseMode: "memory",
  };
}
