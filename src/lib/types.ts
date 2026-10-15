import { z } from "zod";

export const lineItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const requestInputSchema = z.object({
  category: z.literal("event_printing").default("event_printing"),
  location: z.string().min(2).default("College campus"),
  lineItems: z.array(lineItemSchema).min(1),
  targetPriceInr: z.number().positive(),
  maximumPriceInr: z.number().positive(),
  deliveryDeadline: z.string().datetime({ offset: true }),
  hardConstraints: z.array(z.enum(["complete_quantity", "deadline", "digital_proof"])),
  preferences: z.object({
    price: z.number().min(0).max(1),
    specificationMatch: z.number().min(0).max(1),
    evidenceConfidence: z.number().min(0).max(1),
    benefits: z.number().min(0).max(1),
    negotiationGain: z.number().min(0).max(1),
  }),
  mode: z.literal("simulation").default("simulation"),
});

export type RequestInput = z.infer<typeof requestInputSchema>;

export type SessionStatus =
  | "waiting"
  | "calling"
  | "connected"
  | "getting_offer"
  | "negotiating"
  | "validating"
  | "completed"
  | "failed";

export type TranscriptTurn = {
  id: string;
  sequence: number;
  speaker: "agent" | "business" | "system";
  text: string;
  timestamp: string;
  simulated: true;
};

export const transcriptTurnSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().positive(),
  speaker: z.enum(["agent", "business", "system"]),
  text: z.string().min(1),
  timestamp: z.string().datetime(),
  simulated: z.literal(true),
});

export type EvidenceReference = {
  turnId: string;
  speaker: "business";
  quote: string;
};

export type Offer = {
  id: string;
  requestId: string;
  businessId: string;
  businessName: string;
  sessionId: string;
  initialPriceInr: number;
  finalPriceInr: number;
  savingsInr: number;
  savingsPercent: number;
  deliveryAt: string;
  benefits: string[];
  conditions: string[];
  evidence: Record<string, EvidenceReference>;
  confidence: number;
  eligible: boolean;
  rejectionReasons: string[];
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
};

export const offerSchema = z.object({
  id: z.string().min(1),
  requestId: z.string().min(1),
  businessId: z.string().min(1),
  businessName: z.string().min(1),
  sessionId: z.string().min(1),
  initialPriceInr: z.number().nonnegative(),
  finalPriceInr: z.number().nonnegative(),
  savingsInr: z.number(),
  savingsPercent: z.number(),
  deliveryAt: z.string().datetime({ offset: true }),
  benefits: z.array(z.string()),
  conditions: z.array(z.string()),
  evidence: z.record(
    z.string(),
    z.object({ turnId: z.string().min(1), speaker: z.literal("business"), quote: z.string().min(1) }),
  ),
  confidence: z.number().min(0).max(1),
  eligible: z.boolean(),
  rejectionReasons: z.array(z.string()),
  score: z.number().optional(),
  scoreBreakdown: z
    .object({
      price: z.number().min(0).max(100),
      specificationMatch: z.number().min(0).max(100),
      evidenceConfidence: z.number().min(0).max(100),
      benefits: z.number().min(0).max(100),
      negotiationGain: z.number().min(0).max(100),
    })
    .optional(),
});

export type ScoreBreakdown = {
  price: number;
  specificationMatch: number;
  evidenceConfidence: number;
  benefits: number;
  negotiationGain: number;
};

export type Business = {
  id: string;
  name: string;
  fictional: true;
  location: string;
  negotiationProfile: {
    startingPriceInr: number;
    minimumPriceInr: number;
    deliveryAt: string;
    benefits: string[];
    conditions: string[];
    concessionSteps: number[];
    fail?: boolean;
  };
};

export type NegotiationSession = {
  id: string;
  requestId: string;
  businessId: string;
  businessName: string;
  mode: "simulation";
  status: SessionStatus;
  transcript: TranscriptTurn[];
  maxRounds: number;
  startedAt: string;
  endedAt?: string;
  error?: string;
};

export const negotiationSessionSchema = z.object({
  id: z.string().min(1),
  requestId: z.string().min(1),
  businessId: z.string().min(1),
  businessName: z.string().min(1),
  mode: z.literal("simulation"),
  status: z.enum(["waiting", "calling", "connected", "getting_offer", "negotiating", "validating", "completed", "failed"]),
  transcript: z.array(transcriptTurnSchema),
  maxRounds: z.number().int().positive().max(4),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  error: z.string().optional(),
});

export type Recommendation = {
  id: string;
  requestId: string;
  rankedOfferIds: string[];
  winningOfferId: string | null;
  explanation: string;
  createdAt: string;
};

export type NegotiationResult = {
  request: RequestInput & { id: string; createdAt: string };
  businesses: Business[];
  sessions: NegotiationSession[];
  offers: Offer[];
  recommendation: Recommendation;
  databaseMode: "atlas" | "embedded" | "memory";
};

export const demoRequest: RequestInput = {
  category: "event_printing",
  location: "Main college campus",
  lineItems: [
    { name: "A3 colour posters", quantity: 120 },
    { name: "A5 colour flyers", quantity: 500 },
    { name: "Roll-up standees", quantity: 8 },
  ],
  targetPriceInr: 12_000,
  maximumPriceInr: 12_500,
  deliveryDeadline: "2026-10-16T08:00:00+05:30",
  hardConstraints: ["complete_quantity", "deadline", "digital_proof"],
  preferences: {
    price: 0.45,
    specificationMatch: 0.25,
    evidenceConfidence: 0.15,
    benefits: 0.1,
    negotiationGain: 0.05,
  },
  mode: "simulation",
};
