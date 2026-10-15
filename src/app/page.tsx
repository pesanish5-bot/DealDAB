"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brand, SimulationPill } from "@/components/Brand";
import { Results } from "@/components/Results";
import { SessionCard } from "@/components/SessionCard";
import { TranscriptDrawer } from "@/components/TranscriptDrawer";
import { VoiceControls } from "@/components/VoiceControls";
import { demoRequest, type NegotiationResult, type NegotiationSession, type Offer, type RequestInput } from "@/lib/types";

type Stage = "form" | "running" | "results";
const money = (value: number) => value.toLocaleString("en-IN");

function normalizeCreatedId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const nested = obj.request && typeof obj.request === "object" ? obj.request as Record<string, unknown> : undefined;
  const id = obj.id ?? obj._id ?? nested?.id ?? nested?._id;
  return typeof id === "string" ? id : null;
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("form");
  const [form, setForm] = useState<RequestInput>(demoRequest);
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [drawer, setDrawer] = useState<{ session: NegotiationSession; turnId?: string } | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());

  const speak = useCallback((text: string, speaker: "agent" | "business" | "system") => {
    if (muted || speaker === "system" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/INR/g, "rupees"));
    const voices = window.speechSynthesis.getVoices();
    const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
    utterance.voice = english[speaker === "agent" ? 0 : Math.min(1, english.length - 1)] ?? null;
    utterance.rate = speaker === "agent" ? 1.08 : 0.98;
    utterance.pitch = speaker === "agent" ? 1.03 : 0.88;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [muted]);

  useEffect(() => () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  useEffect(() => {
    if (stage !== "running" || !result) return;
    if (speaking) return;
    const sessions = result.sessions;
    const current = sessions[activeIndex];
    if (!current) {
      const timer = window.setTimeout(() => setStage("results"), 500);
      return () => window.clearTimeout(timer);
    }
    const shown = visible[current.id] ?? 0;
    if (current.status === "failed" && shown >= current.transcript.length || shown >= current.transcript.length) {
      const timer = window.setTimeout(() => setActiveIndex((index) => index + 1), 650);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      const next = current.transcript[shown];
      setVisible((state) => ({ ...state, [current.id]: shown + 1 }));
      if (next && !spokenRef.current.has(next.id)) {
        spokenRef.current.add(next.id);
        speak(next.text, next.speaker);
      }
    }, shown === 0 ? 550 : 1250);
    return () => window.clearTimeout(timer);
  }, [activeIndex, result, speak, speaking, stage, visible]);

  const runNegotiation = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setVisible({});
    setActiveIndex(0);
    spokenRef.current.clear();
    setStage("running");
    try {
      const requestResponse = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const created: unknown = await requestResponse.json();
      if (!requestResponse.ok) throw new Error((created as { error?: string }).error ?? "Could not create the request.");
      const requestId = normalizeCreatedId(created);
      if (!requestId) throw new Error("The request was created without an identifier.");
      const negotiateResponse = await fetch(`/api/requests/${requestId}/negotiate`, { method: "POST" });
      const negotiation: unknown = await negotiateResponse.json();
      if (!negotiateResponse.ok) throw new Error((negotiation as { error?: string }).error ?? "Negotiation could not be completed.");
      setResult(negotiation as NegotiationResult);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
      setStage("form");
    }
  };

  const openEvidence = (offer: Offer, key: string) => {
    if (!result) return;
    const session = result.sessions.find((item) => item.id === offer.sessionId);
    const turnId = offer.evidence[key]?.turnId;
    if (session) setDrawer({ session, turnId });
  };

  const completedCount = result ? result.sessions.filter((session) => (visible[session.id] ?? 0) >= session.transcript.length && session.status !== "failed").length : 0;
  const totalTurns = useMemo(() => result?.sessions.reduce((sum, session) => sum + session.transcript.length, 0) ?? 0, [result]);
  const shownTurns = result?.sessions.reduce((sum, session) => sum + (visible[session.id] ?? 0), 0) ?? 0;

  return (
    <main>
      <header className="topbar">
        <Brand />
        <div className="headerMeta"><span className="dbPill"><i /> {result ? `${result.databaseMode.toUpperCase()} DATABASE` : "MONGODB READY"}</span><SimulationPill /></div>
      </header>

      {stage === "form" && (
        <section className="hero">
          <div className="heroCopy">
            <span className="eyebrow"><i /> Voice-first procurement</span>
            <h1>Three vendor calls.<br /><em>One smarter deal.</em></h1>
            <p>Tell BidWise what you need. Our AI voice agent negotiates with multiple businesses, validates every offer, and recommends the best value—with the transcript evidence to prove it.</p>
            <div className="flowStrip"><span>YOUR BRIEF</span><b>→</b><span>VOICE NEGOTIATION</span><b>→</b><span>PROOF-BACKED PICK</span></div>
          </div>
          <form className="requestCard" onSubmit={runNegotiation}>
            <div className="cardTitle"><div><span className="eyebrow">New negotiation</span><h2>College event printing</h2></div><span className="stepTag">01 / BRIEF</span></div>
            <label>Delivery location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></label>
            <div className="itemsLabel"><span>What you need</span><small>PRELOADED DEMO BASKET</small></div>
            <div className="lineItems">
              {form.lineItems.map((item, index) => <div key={item.name}><b>{item.quantity}</b><span>{item.name}</span><i>✓</i></div>)}
            </div>
            <div className="twoColumns">
              <label>Target price <div className="inputPrefix"><span>₹</span><input type="number" value={form.targetPriceInr} onChange={(e) => setForm({ ...form, targetPriceInr: Number(e.target.value) })} /></div></label>
              <label>Hard maximum <div className="inputPrefix"><span>₹</span><input type="number" value={form.maximumPriceInr} onChange={(e) => setForm({ ...form, maximumPriceInr: Number(e.target.value) })} /></div></label>
            </div>
            <div className="constraints"><span>✓ Complete quantity</span><span>✓ Before 8:00 AM</span><span>✓ Digital proof</span></div>
            {error && <div className="errorBox" role="alert"><b>Couldn’t start the demo.</b> {error}</div>}
            <button className="primaryButton" type="submit"><span className="pulseDot" /> Start voice negotiations <span>→</span></button>
            <p className="formNote">Runs against three fictional vendors. No real calls or commitments are made.</p>
          </form>
        </section>
      )}

      {stage === "running" && (
        <section className="commandCenter">
          <div className="sectionHeading">
            <div><span className="eyebrow"><i /> Live command center</span><h1>Negotiations in progress</h1><p>BidWise is collecting and improving comparable offers.</p></div>
            <VoiceControls muted={muted} speaking={speaking} onMute={() => { setMuted((value) => !value); if (!muted) window.speechSynthesis?.cancel(); }} onSkip={() => window.speechSynthesis?.cancel()} />
          </div>
          {!result ? <div className="loadingPanel"><div className="orb"><span /><span /><span /></div><h2>Preparing vendor agents</h2><p>Creating the request, loading businesses and opening simulated voice sessions…</p></div> : <>
            <div className="runSummary"><span><b>{completedCount}</b> / {result.sessions.length} calls complete</span><div><i style={{ width: `${totalTurns ? (shownTurns / totalTurns) * 100 : 0}%` }} /></div><span>{shownTurns} evidence turns captured</span></div>
            <div className="sessionGrid">{result.sessions.map((session, index) => <SessionCard key={session.id} session={session} active={activeIndex === index} visibleTurns={visible[session.id] ?? 0} onOpen={() => setDrawer({ session })} />)}</div>
            <div className="systemNote"><span>◉</span><div><b>Guardrails are active</b><p>Maximum ₹{money(form.maximumPriceInr)} · 4 rounds maximum · no purchase authority</p></div></div>
          </>}
        </section>
      )}

      {stage === "results" && result && <div className="resultsWrap"><Results result={result} onEvidence={openEvidence} /><button className="repeatButton" type="button" onClick={() => { window.speechSynthesis?.cancel(); setStage("form"); setResult(null); setDrawer(null); }}>↻ Run the demo again</button></div>}
      <TranscriptDrawer session={drawer?.session ?? null} highlightTurnId={drawer?.turnId} onClose={() => setDrawer(null)} />
      <footer><span>BidWise AI · The Negotiator</span><span>Transparent by design · Human approval required</span></footer>
    </main>
  );
}
