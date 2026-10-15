import { randomUUID } from "node:crypto";
import type {
  Business,
  EvidenceReference,
  NegotiationSession,
  Offer,
  RequestInput,
  TranscriptTurn,
} from "./types";
import { negotiationSessionSchema, offerSchema } from "./types";

const MAX_NEGOTIATION_ROUNDS = 4;

function turn(
  sessionId: string,
  sequence: number,
  speaker: TranscriptTurn["speaker"],
  text: string,
): TranscriptTurn {
  return {
    id: `${sessionId}-t${String(sequence).padStart(2, "0")}`,
    sequence,
    speaker,
    text,
    timestamp: new Date(Date.now() + sequence * 1_000).toISOString(),
    simulated: true,
  };
}

function evidence(source: TranscriptTurn): EvidenceReference {
  if (source.speaker !== "business") {
    throw new Error("Evidence must reference a business turn");
  }
  return { turnId: source.id, speaker: "business", quote: source.text };
}

export function negotiateWithBusiness(
  requestId: string,
  request: RequestInput,
  business: Business,
): { session: NegotiationSession; offer?: Offer } {
  const id = randomUUID();
  const startedAt = new Date().toISOString();

  if (business.negotiationProfile.fail) {
    return {
      session: negotiationSessionSchema.parse({
        id,
        requestId,
        businessId: business.id,
        businessName: business.name,
        mode: "simulation",
        status: "failed",
        transcript: [turn(id, 1, "system", "The simulated business did not answer.")],
        maxRounds: MAX_NEGOTIATION_ROUNDS,
        startedAt,
        endedAt: new Date().toISOString(),
        error: "Business did not answer",
      }),
    };
  }

  const profile = business.negotiationProfile;
  const basket = request.lineItems.map((item) => `${item.quantity} ${item.name}`).join(", ");
  const transcript: TranscriptTurn[] = [];
  transcript.push(
    turn(
      id,
      1,
      "agent",
      `Hello, I am BidWise, an AI assistant calling for a college event team. This is a simulated vendor call. Please quote ${basket}.`,
    ),
  );
  const initial = turn(
    id,
    2,
    "business",
    `Our initial total is INR ${profile.startingPriceInr.toLocaleString("en-IN")}. We can deliver at ${new Date(profile.deliveryAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}.`,
  );
  transcript.push(initial);

  let sequence = 3;
  let finalPrice = profile.startingPriceInr;
  for (const concession of profile.concessionSteps.slice(0, MAX_NEGOTIATION_ROUNDS - 1)) {
    transcript.push(
      turn(
        id,
        sequence++,
        "agent",
        `Our target is INR ${request.targetPriceInr.toLocaleString("en-IN")} and our maximum acceptable quote is INR ${request.maximumPriceInr.toLocaleString("en-IN")}. Can you improve the total while preserving the deadline and digital proof?`,
      ),
    );
    finalPrice = concession;
    transcript.push(
      turn(
        id,
        sequence++,
        "business",
        `We can revise the complete order to INR ${concession.toLocaleString("en-IN")}, deliver at ${new Date(profile.deliveryAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}, and include ${profile.benefits.join(" and ")}.`,
      ),
    );
    if (concession <= request.maximumPriceInr) break;
  }

  const finalTurn = transcript.at(-1)!;
  const confirmation = turn(
    id,
    sequence,
    "business",
    `Final offer: INR ${finalPrice.toLocaleString("en-IN")}. Delivery remains ${new Date(profile.deliveryAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}. Conditions: ${profile.conditions.join("; ")}.`,
  );
  transcript.push(confirmation);

  const evidenceMap: Record<string, EvidenceReference> = {
    initialPrice: evidence(initial),
    finalPrice: evidence(confirmation),
    delivery: evidence(confirmation),
    benefits: evidence(finalTurn.speaker === "business" ? finalTurn : confirmation),
    conditions: evidence(confirmation),
  };

  const offer: Offer = offerSchema.parse({
    id: randomUUID(),
    requestId,
    businessId: business.id,
    businessName: business.name,
    sessionId: id,
    initialPriceInr: profile.startingPriceInr,
    finalPriceInr: finalPrice,
    savingsInr: profile.startingPriceInr - finalPrice,
    savingsPercent: Number((((profile.startingPriceInr - finalPrice) / profile.startingPriceInr) * 100).toFixed(1)),
    deliveryAt: profile.deliveryAt,
    benefits: profile.benefits,
    conditions: profile.conditions,
    evidence: evidenceMap,
    confidence: 1,
    eligible: false,
    rejectionReasons: [],
  });

  return {
    session: negotiationSessionSchema.parse({
      id,
      requestId,
      businessId: business.id,
      businessName: business.name,
      mode: "simulation",
      status: "completed",
      transcript,
      maxRounds: MAX_NEGOTIATION_ROUNDS,
      startedAt,
      endedAt: new Date().toISOString(),
    }),
    offer,
  };
}

export { MAX_NEGOTIATION_ROUNDS };
