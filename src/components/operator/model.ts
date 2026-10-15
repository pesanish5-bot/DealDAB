import { demoBusinesses } from "@/lib/demo-data";
import type { Business, NegotiationResult, NegotiationSession, Offer, TranscriptTurn } from "@/lib/types";

export function revealedResult(result: NegotiationResult, visible: Record<string, number>): NegotiationResult {
  const sessions = result.sessions.filter((session) => (visible[session.id] ?? 0) >= session.transcript.length);
  const sessionIds = new Set(sessions.map((session) => session.id));
  const offers = result.offers.filter((offer) => sessionIds.has(offer.sessionId));
  const rankedOfferIds = result.recommendation.rankedOfferIds.filter((id) => offers.some((offer) => offer.id === id));
  const winnerRevealed = offers.some((offer) => offer.id === result.recommendation.winningOfferId);
  return {
    ...result,
    businesses: result.businesses.filter((business) => sessions.some((session) => session.businessId === business.id)),
    sessions,
    offers,
    recommendation: {
      ...result.recommendation,
      rankedOfferIds,
      winningOfferId: winnerRevealed ? result.recommendation.winningOfferId : rankedOfferIds.find((id) => offers.find((offer) => offer.id === id)?.eligible) ?? null,
      explanation: winnerRevealed
        ? result.recommendation.explanation
        : "This comparison includes only calls that have already closed. The final recommendation appears when every line has finished.",
    },
  };
}

export const money = (value: number) => value.toLocaleString("en-IN");
export const rupee = (value: number) => `₹${money(value)}`;

export function clockFromSequence(sequence: number) {
  const total = 4 + Math.max(0, sequence - 1) * 7;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function inrValues(text: string): number[] {
  return [...text.matchAll(/INR\s*([\d,]+)/g)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter((value) => Number.isFinite(value));
}

export type LinePhase = "negotiating" | "received" | "waiting" | "failed" | "calling";

export type VendorLine = {
  businessId: string;
  name: string;
  detail: string;
  phase: LinePhase;
  priceLabel: string;
  price: string | null;
  note: string;
  progress: number;
  selected: boolean;
};

export type PipelineStep = {
  id: "waiting" | "calling" | "connected" | "negotiating" | "final";
  label: string;
  state: "done" | "active" | "pending";
};

const PIPELINE: Array<Pick<PipelineStep, "id" | "label">> = [
  { id: "waiting", label: "Waiting" },
  { id: "calling", label: "Calling" },
  { id: "connected", label: "Connected" },
  { id: "negotiating", label: "Negotiating" },
  { id: "final", label: "Final offer" },
];

export function pipeline(session: NegotiationSession | undefined, shown: number): PipelineStep[] {
  if (!session) return PIPELINE.map((step, index) => ({ ...step, state: index === 0 ? "active" : "pending" }));
  if (session.status === "failed") {
    return PIPELINE.map((step, index) => ({ ...step, state: index === 0 ? "done" : index === 1 ? "active" : "pending" }));
  }
  const total = session.transcript.length;
  if (total > 0 && shown >= total) return PIPELINE.map((step) => ({ ...step, state: "done" }));
  const activeIndex = shown <= 0 ? 1 : shown === 1 ? 2 : 3;
  return PIPELINE.map((step, index) => ({
    ...step,
    state: index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
  }));
}

export function chipLabel(text: string) {
  const amounts = inrValues(text);
  if (amounts.length) return rupee(amounts[amounts.length - 1]);
  if (/deliver/i.test(text) && /includ/i.test(text)) return "Delivery included";
  if (/deliver/i.test(text)) return "Delivery";
  if (/condition/i.test(text)) return "Conditions";
  return "Quoted terms";
}

export function shortRequestId(id: string | undefined) {
  if (!id) return "new";
  return id.replaceAll("-", "").slice(0, 4);
}

function shownTurns(session: NegotiationSession | undefined, visible: Record<string, number>) {
  if (!session) return [];
  return session.transcript.slice(0, visible[session.id] ?? 0);
}

function latestAmount(turns: TranscriptTurn[]) {
  const amounts = turns.filter((turn) => turn.speaker === "business").flatMap((turn) => inrValues(turn.text));
  return amounts.at(-1) ?? null;
}

function firstAmount(turns: TranscriptTurn[]) {
  const amounts = turns.filter((turn) => turn.speaker === "business").flatMap((turn) => inrValues(turn.text));
  return amounts[0] ?? null;
}

export function buildLines(
  result: NegotiationResult | null,
  visible: Record<string, number>,
  activeIndex: number,
  selectedBusinessId: string | null,
  loading: boolean,
): VendorLine[] {
  const businesses: Business[] = result?.businesses ?? demoBusinesses;
  return businesses.map((business, index) => {
    const session = result?.sessions.find((item) => item.businessId === business.id);
    const turns = shownTurns(session, visible);
    const total = session?.transcript.length ?? 0;
    const shown = turns.length;
    const complete = Boolean(session && total > 0 && shown >= total && session.status !== "failed");
    const failed = session?.status === "failed" && shown > 0;
    const live = Boolean(result && index === activeIndex && !complete && !failed);
    const focusIndex = Math.min(activeIndex, Math.max(businesses.length - 1, 0));
    const phase: LinePhase = failed ? "failed" : complete ? "received" : live ? (shown === 0 ? "calling" : "negotiating") : loading && index === 0 ? "calling" : "waiting";
    const current = latestAmount(turns);
    const opening = firstAmount(turns);
    const offer = result?.offers.find((item) => item.sessionId === session?.id);
    const steps = pipeline(session, shown);
    const activeStep = steps.findIndex((step) => step.state === "active");
    const stageNo = activeStep >= 0 ? activeStep + 1 : 5;
    const clock = turns.at(-1) ? clockFromSequence(turns.at(-1)!.sequence) : "00:00";
    const selected = selectedBusinessId ? business.id === selectedBusinessId : index === focusIndex;
    return {
      businessId: business.id,
      name: business.name,
      detail: business.location,
      phase,
      priceLabel: phase === "received" ? "Final offer" : phase === "waiting" ? "Offer" : "Current offer",
      price: phase === "received" ? rupee(offer?.finalPriceInr ?? current ?? opening ?? 0) : current ? rupee(current) : null,
      note: phase === "received"
        ? `${rupee(offer?.initialPriceInr ?? opening ?? business.negotiationProfile.startingPriceInr)} was the opening quote`
        : phase === "negotiating" || phase === "calling"
          ? `Stage ${stageNo} of 5 · ${phase === "calling" ? "calling" : "negotiating"} · demo ${clock}`
          : phase === "failed"
            ? session?.error ?? "Simulated line did not connect"
            : "Queued · starts when the active line closes",
      progress: total ? shown / total : phase === "calling" ? 0.08 : 0,
      selected,
    };
  });
}

export function boardStatus(lines: VendorLine[]) {
  const negotiating = lines.filter((line) => line.phase === "negotiating" || line.phase === "calling");
  const received = lines.filter((line) => line.phase === "received");
  const waiting = lines.filter((line) => line.phase === "waiting");
  const lead = negotiating.length
    ? `${negotiating.length} of ${lines.length} businesses is negotiating`
    : received.length === lines.length
      ? `All ${lines.length} businesses have returned offers`
      : `${received.length} of ${lines.length} businesses have returned offers`;
  const waitingNames = waiting.map((line) => line.name).join(" and ");
  const parts = [
    lead,
    negotiating.length && received.length ? `${received.map((line) => line.name).join(" and ")} ${received.length > 1 ? "have" : "has"} already returned an offer` : "",
    waitingNames ? `${waitingNames} ${waiting.length > 1 ? "are" : "is"} still waiting` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function turnRevealed(session: NegotiationSession | undefined, visible: Record<string, number>, turnId: string | undefined) {
  if (!session || !turnId) return false;
  const shown = visible[session.id] ?? 0;
  return session.transcript.slice(0, shown).some((turn) => turn.id === turnId);
}

export function inspectorModel(
  result: NegotiationResult | null,
  session: NegotiationSession | undefined,
  business: Business | undefined,
  visible: Record<string, number>,
) {
  const turns = shownTurns(session, visible);
  const offer: Offer | undefined = result?.offers.find((item) => item.sessionId === session?.id);
  const complete = Boolean(session && session.transcript.length > 0 && turns.length >= session.transcript.length && session.status !== "failed");
  const initial = firstAmount(turns) ?? (turns.length ? offer?.initialPriceInr ?? null : null);
  const current = latestAmount(turns);
  const benefitsReady = Boolean(offer && turnRevealed(session, visible, offer.evidence.benefits?.turnId));
  const conditionsReady = Boolean(offer && turnRevealed(session, visible, offer.evidence.conditions?.turnId));
  const saved = initial !== null && current !== null ? initial - current : 0;
  const savedPercent = initial ? Math.round((saved / initial) * 100) : 0;
  const evidence = turns.filter((turn) => turn.speaker === "business").map((turn, index) => ({
    id: turn.id,
    code: `E${String(index + 1).padStart(2, "0")}`,
    clock: clockFromSequence(turn.sequence),
    label: chipLabel(turn.text),
  }));
  return {
    offer,
    complete,
    initial,
    current,
    final: complete ? offer?.finalPriceInr ?? current : null,
    saved: saved > 0 ? saved : 0,
    savedPercent: saved > 0 ? savedPercent : 0,
    benefits: benefitsReady ? offer?.benefits ?? [] : [],
    conditions: conditionsReady ? offer?.conditions ?? [] : [],
    evidence,
    businessName: session?.businessName ?? business?.name ?? "Vendor",
    clock: turns.at(-1) ? clockFromSequence(turns.at(-1)!.sequence) : "00:00",
    strategy: [...turns].reverse().find((turn) => turn.speaker === "agent")?.text
      ?? "Opening the simulated line and asking for a complete quote.",
    steps: pipeline(session, turns.length),
    turns,
  };
}
