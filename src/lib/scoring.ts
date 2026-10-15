import { randomUUID } from "node:crypto";
import type { Offer, Recommendation, RequestInput } from "./types";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function deadlineLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

function validateOffer(offer: Offer, request: RequestInput): Offer {
  const reasons: string[] = [];
  if (offer.finalPriceInr > request.maximumPriceInr) {
    reasons.push(`Quote exceeds the maximum acceptable price of INR ${request.maximumPriceInr.toLocaleString("en-IN")}.`);
  }
  if (request.hardConstraints.includes("deadline") && new Date(offer.deliveryAt).getTime() > new Date(request.deliveryDeadline).getTime()) {
    reasons.push(`Delivery misses the hard ${deadlineLabel(request.deliveryDeadline)} deadline.`);
  }
  if (request.hardConstraints.includes("digital_proof") && !offer.benefits.includes("digital proof")) {
    reasons.push("Digital proof is not confirmed.");
  }
  const requiredEvidence = ["initialPrice", "finalPrice", "delivery", "benefits", "conditions"];
  if (requiredEvidence.some((key) => !offer.evidence[key]?.turnId)) {
    reasons.push("One or more required fields lacks transcript evidence.");
  }
  return { ...offer, eligible: reasons.length === 0, rejectionReasons: reasons };
}

export function scoreOffers(
  offers: Offer[],
  request: RequestInput,
): { offers: Offer[]; recommendation: Recommendation } {
  const validated = offers.map((offer) => validateOffer(offer, request));
  const eligible = validated.filter((offer) => offer.eligible);
  const prices = eligible.map((offer) => offer.finalPriceInr);
  const gains = eligible.map((offer) => offer.savingsInr);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minGain = Math.min(...gains);
  const maxGain = Math.max(...gains);

  const scored = validated.map((offer) => {
    if (!offer.eligible) return offer;
    const price = maxPrice === minPrice ? 100 : 100 - ((offer.finalPriceInr - minPrice) / (maxPrice - minPrice)) * 100;
    const gain = maxGain === minGain ? 100 : ((offer.savingsInr - minGain) / (maxGain - minGain)) * 100;
    const benefits = clamp(50 + Math.max(0, offer.benefits.length - 1) * 25);
    const breakdown = {
      price: clamp(price),
      specificationMatch: 100,
      evidenceConfidence: offer.confidence * 100,
      benefits,
      negotiationGain: clamp(gain),
    };
    const weights = request.preferences;
    const score =
      breakdown.price * weights.price +
      breakdown.specificationMatch * weights.specificationMatch +
      breakdown.evidenceConfidence * weights.evidenceConfidence +
      breakdown.benefits * weights.benefits +
      breakdown.negotiationGain * weights.negotiationGain;
    return { ...offer, score: Number(score.toFixed(1)), scoreBreakdown: breakdown };
  });

  const ranked = scored
    .filter((offer) => offer.eligible)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.finalPriceInr - b.finalPriceInr);
  const winner = ranked[0];
  const rejected = scored.filter((offer) => !offer.eligible);
  const rejectedSummary = rejected.length
    ? ` ${rejected.map((offer) => `${offer.businessName} was excluded because ${offer.rejectionReasons.join(" ")}`).join(" ")}`
    : "";
  const explanation = winner
    ? `${winner.businessName} is the best eligible offer at INR ${winner.finalPriceInr.toLocaleString("en-IN")}, with ${winner.benefits.join(", ")}. Its score is ${winner.score}.` + rejectedSummary
    : "No defensible recommendation is available because every completed offer failed a hard constraint or lacked evidence.";

  return {
    offers: scored,
    recommendation: {
      id: randomUUID(),
      requestId: offers[0]?.requestId ?? "unknown",
      rankedOfferIds: ranked.map((offer) => offer.id),
      winningOfferId: winner?.id ?? null,
      explanation,
      createdAt: new Date().toISOString(),
    },
  };
}
