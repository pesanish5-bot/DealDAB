import { describe, expect, it } from "vitest";
import { getVoiceCapability } from "../src/lib/calling";
import { demoBusinesses } from "../src/lib/demo-data";
import { MAX_NEGOTIATION_ROUNDS, negotiateWithBusiness } from "../src/lib/negotiation";
import { speechText } from "../src/lib/speech";
import { createRequestDocument, runNegotiations } from "../src/lib/service";
import { demoRequest, requestInputSchema } from "../src/lib/types";

describe("BidWise demo flow", () => {
  it("reports browser voice honestly when phone credentials are absent", () => {
    const apiKey = process.env.VAPI_API_KEY;
    const phoneId = process.env.VAPI_PHONE_NUMBER_ID;
    delete process.env.VAPI_API_KEY;
    delete process.env.VAPI_PHONE_NUMBER_ID;

    expect(getVoiceCapability()).toMatchObject({
      activeMode: "browser-demo",
      browserDemoReady: true,
      realCallsConfigured: false,
      provider: "Vapi",
    });

    if (apiKey) process.env.VAPI_API_KEY = apiKey;
    if (phoneId) process.env.VAPI_PHONE_NUMBER_ID = phoneId;
  });

  it("creates a deterministic Hindi speech layer without changing evidence text", () => {
    const evidenceText = "Final offer: INR 12,400. Delivery remains 8:00 am. Conditions: approved proof returned before 7 PM.";
    const spoken = speechText(evidenceText, "hi-IN");

    expect(spoken).toContain("अंतिम प्रस्ताव 12,400 रुपये");
    expect(spoken).toContain("शर्तें");
    expect(evidenceText).toContain("Final offer");
  });

  it("creates a validated negotiation request with an id and timestamp", () => {
    const input = requestInputSchema.parse(demoRequest);
    const created = createRequestDocument(input);

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
    expect(created.category).toBe("event_printing");
    expect(created.maximumPriceInr).toBe(12_500);
    expect(created.lineItems).toHaveLength(3);
  });

  it("loads exactly three clearly fictional demo businesses", () => {
    expect(demoBusinesses).toHaveLength(3);
    expect(demoBusinesses.map((business) => business.name)).toEqual([
      "CampusPrint Studio",
      "QuickInk Express",
      "PixelPress Works",
    ]);
    expect(demoBusinesses.every((business) => business.fictional)).toBe(true);
  });

  it.each(demoBusinesses)("captures initial and final offers for $name", (business) => {
    const request = createRequestDocument(demoRequest);
    const { session, offer } = negotiateWithBusiness(request.id, request, business);

    expect(session.status).toBe("completed");
    expect(offer).toBeDefined();
    expect(offer?.initialPriceInr).toBe(business.negotiationProfile.startingPriceInr);
    expect(offer?.finalPriceInr).toBeLessThanOrEqual(offer!.initialPriceInr);
    expect(offer?.savingsInr).toBe(offer!.initialPriceInr - offer!.finalPriceInr);
  });

  it("keeps negotiation bounded by the configured maximum", () => {
    const request = createRequestDocument(demoRequest);
    const { session } = negotiateWithBusiness(request.id, request, demoBusinesses[0]);
    const counterOffers = session.transcript.filter(
      (turn) => turn.speaker === "agent" && turn.text.includes("Can you improve"),
    );

    expect(session.maxRounds).toBe(MAX_NEGOTIATION_ROUNDS);
    expect(counterOffers.length).toBeLessThanOrEqual(MAX_NEGOTIATION_ROUNDS);
  });

  it("selects PixelPress as the only eligible and winning offer", () => {
    const result = runNegotiations(createRequestDocument(demoRequest));
    const winner = result.offers.find(
      (offer) => offer.id === result.recommendation.winningOfferId,
    );

    expect(winner?.businessName).toBe("PixelPress Works");
    expect(winner?.eligible).toBe(true);
    expect(result.recommendation.rankedOfferIds).toEqual([winner?.id]);
    expect(result.recommendation.explanation).toContain("PixelPress Works");
  });

  it("rejects QuickInk because its delivery misses the hard deadline", () => {
    const result = runNegotiations(createRequestDocument(demoRequest));
    const quickInk = result.offers.find((offer) => offer.businessName === "QuickInk Express");

    expect(quickInk?.finalPriceInr).toBeLessThan(demoRequest.maximumPriceInr);
    expect(quickInk?.eligible).toBe(false);
    expect(quickInk?.rejectionReasons).toContain("Delivery misses the hard 8:00 AM deadline.");
  });

  it("resolves every evidence reference to the exact business transcript turn", () => {
    const result = runNegotiations(createRequestDocument(demoRequest));

    for (const offer of result.offers) {
      const session = result.sessions.find((candidate) => candidate.id === offer.sessionId);
      expect(session).toBeDefined();

      for (const reference of Object.values(offer.evidence)) {
        const citedTurn = session?.transcript.find((turn) => turn.id === reference.turnId);
        expect(citedTurn, `${offer.businessName} evidence ${reference.turnId}`).toBeDefined();
        expect(citedTurn?.speaker).toBe("business");
        expect(citedTurn?.text).toBe(reference.quote);
      }
    }
  });

  it("still recommends from completed offers when one business fails", () => {
    const businesses = demoBusinesses.map((business) =>
      business.id === "campusprint-demo"
        ? {
            ...business,
            negotiationProfile: { ...business.negotiationProfile, fail: true },
          }
        : business,
    );
    const result = runNegotiations(createRequestDocument(demoRequest), businesses);

    expect(result.sessions).toHaveLength(3);
    expect(result.sessions.filter((session) => session.status === "failed")).toHaveLength(1);
    expect(result.offers).toHaveLength(2);
    const winner = result.offers.find(
      (offer) => offer.id === result.recommendation.winningOfferId,
    );
    expect(winner?.businessName).toBe("PixelPress Works");
  });
});
