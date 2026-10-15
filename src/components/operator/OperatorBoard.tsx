"use client";

import type { FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { demoBusinesses } from "@/lib/demo-data";
import { Results } from "@/components/Results";
import type { SpokenLanguage } from "@/lib/speech";
import type { NegotiationResult, Offer, RequestInput } from "@/lib/types";
import { ActiveCallPanel } from "./ActiveCallPanel";
import { BottomActionBar } from "./BottomActionBar";
import { OfferInspector } from "./OfferInspector";
import { RequestSheet } from "./RequestSheet";
import { TranscriptPanel } from "./TranscriptPanel";
import { VendorLineList } from "./VendorLineList";
import { boardStatus, buildLines, inspectorModel, money, revealedResult, shortRequestId } from "./model";

type VoiceOption = { name: string; lang: string; voiceURI: string };

export function OperatorBoard({
  form,
  result,
  visible,
  activeIndex,
  selectedBusinessId,
  highlightTurnId,
  loading,
  speaking,
  muted,
  comparing,
  requestOpen,
  error,
  realCallsConfigured,
  databaseLabel,
  viewerLabel,
  voices,
  language,
  agentVoiceUri,
  businessVoiceUri,
  rate,
  onSelectBusiness,
  onHighlight,
  onMute,
  onSkip,
  onCompare,
  onOpenRequest,
  onCloseRequest,
  onChangeForm,
  onLanguage,
  onAgentVoice,
  onBusinessVoice,
  onRate,
  onPreview,
  onSubmit,
  onEvidenceOffer,
  onSignOut,
}: {
  form: RequestInput;
  result: NegotiationResult | null;
  visible: Record<string, number>;
  activeIndex: number;
  selectedBusinessId: string | null;
  highlightTurnId?: string;
  loading: boolean;
  speaking: boolean;
  muted: boolean;
  comparing: boolean;
  requestOpen: boolean;
  error: string | null;
  realCallsConfigured: boolean;
  databaseLabel: string;
  viewerLabel: string;
  voices: VoiceOption[];
  language: SpokenLanguage;
  agentVoiceUri: string;
  businessVoiceUri: string;
  rate: number;
  onSelectBusiness: (businessId: string) => void;
  onHighlight: (turnId: string) => void;
  onMute: () => void;
  onSkip: () => void;
  onCompare: () => void;
  onOpenRequest: () => void;
  onCloseRequest: () => void;
  onChangeForm: (form: RequestInput) => void;
  onLanguage: (language: SpokenLanguage) => void;
  onAgentVoice: (uri: string) => void;
  onBusinessVoice: (uri: string) => void;
  onRate: (rate: number) => void;
  onPreview: (speaker: "agent" | "business") => void;
  onSubmit: (event: FormEvent) => void;
  onEvidenceOffer: (offer: Offer, key: string) => void;
  onSignOut: () => void;
}) {
  const lines = buildLines(result, visible, activeIndex, selectedBusinessId, loading);
  const selected = lines.find((line) => line.selected) ?? lines[0];
  const session = result?.sessions.find((item) => item.businessId === selected?.businessId);
  const business = (result?.businesses ?? demoBusinesses).find((item) => item.id === selected?.businessId);
  const model = inspectorModel(result, session, business, visible);
  const requestId = shortRequestId(result?.request.id);
  const basket = form.lineItems.map((item) => `${item.quantity} ${item.name}`).join(" · ");
  const requestLine = `Request ${requestId} · ${basket} · ${form.location} · budget ₹${money(form.maximumPriceInr)}`;
  const received = lines.filter((line) => line.phase === "received").length;
  const live = Boolean(session && model.turns.length < session.transcript.length && session.status !== "failed");
  const persisted = model.complete && result
    ? result.databaseMode === "memory"
      ? null
      : `Offer recorded · quoted lines saved to request ${requestId}`
    : null;
  const footer = !session
    ? "Opening the simulated lines"
    : session.status === "failed"
      ? `${session.businessName} did not answer`
      : live
        ? `Awaiting ${session.businessName}'s next line · simulated playback ${speaking ? "playing" : "paused"} at ${model.clock}`
        : `Line closed · simulated playback complete at ${model.clock}`;

  return (
    <div className="console">
      <header className="consoleHeader">
        <div className="brandLockup">
          <span className="brandPhone" aria-hidden="true">☎</span>
          <span><strong>DealDAB</strong><small>Voice negotiation console</small></span>
        </div>
        <div className="boardTitle">
          <strong>Operator board — {live || loading ? "active call" : "offers"}</strong>
          <small>{requestLine}</small>
        </div>
        <div className="headerActions">
          <span className="demoPill">Illustrative demo data · simulated call</span>
          <span className="dbNote">{databaseLabel}</span>
          <span className="userPill" title={`Signed in as ${viewerLabel}`}><i>{viewerLabel.slice(0, 1).toUpperCase()}</i>{viewerLabel}</span>
          <button type="button" onClick={onOpenRequest}>Open request</button>
          <button type="button" onClick={() => { const quote = model.evidence.at(-1); if (quote) onHighlight(quote.id); }} disabled={!model.evidence.length}>View quote</button>
          <button type="button" className="copper" onClick={onCompare} disabled={!received && !comparing}>Compare available offers</button>
          <button type="button" className="signOutButton" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
      {comparing && result ? (
        <motion.div key="comparison" className="consoleCompare" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .22 }}>
          <Results result={revealedResult(result, visible)} onEvidence={onEvidenceOffer} />
          <p className="compareNote">Comparison uses the scored offers stored for this request. Hard constraints still reject an attractive price that misses a requirement.</p>
        </motion.div>
      ) : (
        <motion.div key="operator" className="consoleBody" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
          <VendorLineList lines={lines} onSelect={onSelectBusiness} />
          <main className="callColumn">
            <ActiveCallPanel
              vendor={model.businessName}
              clock={model.clock}
              speaking={speaking && live}
              paused={!speaking}
              steps={model.steps}
              strategy={model.strategy.replaceAll("INR ", "₹")}
              muted={muted}
              onMute={onMute}
              onSkip={onSkip}
            />
            <TranscriptPanel
              vendor={model.businessName}
              turns={model.turns}
              highlightTurnId={highlightTurnId}
              footer={footer}
              onEvidence={onHighlight}
            />
          </main>
          <OfferInspector
            model={model}
            requestLabel=""
            persisted={persisted}
            onEvidence={onHighlight}
            onViewQuote={() => { const quote = model.evidence.at(-1); if (quote) onHighlight(quote.id); }}
          />
        </motion.div>
      )}
      </AnimatePresence>

      <BottomActionBar
        lines={lines}
        status={boardStatus(lines)}
        nextAction={received ? "compare the offers already received" : "let the active line finish"}
        canCompare={received > 0}
        comparing={comparing}
        onCompare={onCompare}
      />
      <RequestSheet
        open={requestOpen}
        form={form}
        error={error}
        realCallsConfigured={realCallsConfigured}
        voices={voices}
        language={language}
        agentVoiceUri={agentVoiceUri}
        businessVoiceUri={businessVoiceUri}
        rate={rate}
        onClose={onCloseRequest}
        onChange={onChangeForm}
        onLanguage={onLanguage}
        onAgentVoice={onAgentVoice}
        onBusinessVoice={onBusinessVoice}
        onRate={onRate}
        onPreview={onPreview}
        onSubmit={onSubmit}
      />
    </div>
  );
}
