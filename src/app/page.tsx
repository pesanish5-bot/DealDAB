"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AuthScreen, type AuthViewer } from "@/components/AuthScreen";
import { OperatorBoard } from "@/components/operator/OperatorBoard";
import { speechText, type SpokenLanguage } from "@/lib/speech";
import { demoRequest, type NegotiationResult, type Offer, type RequestInput } from "@/lib/types";
import "./operator.css";

let demoBooted = false;

type Stage = "running";
type Health = {
  database: { ok: boolean; mode: "atlas" | "embedded" | "memory" };
  voice: { activeMode: "browser-demo" | "vapi"; realCallsConfigured: boolean };
};
function normalizeCreatedId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const nested = obj.request && typeof obj.request === "object" ? obj.request as Record<string, unknown> : undefined;
  const id = obj.id ?? obj._id ?? nested?.id ?? nested?._id;
  return typeof id === "string" ? id : null;
}

export default function Home() {
  const [viewer, setViewer] = useState<AuthViewer | null | undefined>(undefined);
  const [guest, setGuest] = useState(false);
  const [stage] = useState<Stage>("running");
  const [form, setForm] = useState<RequestInput>(demoRequest);
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [highlightTurnId, setHighlightTurnId] = useState<string | undefined>();
  const [comparing, setComparing] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceLanguage, setVoiceLanguage] = useState<SpokenLanguage>("en-IN");
  const [agentVoiceUri, setAgentVoiceUri] = useState("");
  const [businessVoiceUri, setBusinessVoiceUri] = useState("");
  const [voiceRate, setVoiceRate] = useState(1);
  const [voiceSettingsReady, setVoiceSettingsReady] = useState(false);
  const spokenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { user: AuthViewer | null }) => setViewer(payload.user))
      .catch(() => setViewer(null));
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((payload: Health) => setHealth(payload))
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("dealdab-voice-settings") ?? "null") as Partial<{
        language: SpokenLanguage;
        agentVoiceUri: string;
        businessVoiceUri: string;
        rate: number;
      }> | null;
      if (saved?.language === "en-IN" || saved?.language === "hi-IN") setVoiceLanguage(saved.language);
      if (typeof saved?.agentVoiceUri === "string") setAgentVoiceUri(saved.agentVoiceUri);
      if (typeof saved?.businessVoiceUri === "string") setBusinessVoiceUri(saved.businessVoiceUri);
      if (typeof saved?.rate === "number" && saved.rate >= 0.8 && saved.rate <= 1.25) setVoiceRate(saved.rate);
    } catch {
      window.localStorage.removeItem("dealdab-voice-settings");
    } finally {
      setVoiceSettingsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!voiceSettingsReady) return;
    window.localStorage.setItem("dealdab-voice-settings", JSON.stringify({
      language: voiceLanguage,
      agentVoiceUri,
      businessVoiceUri,
      rate: voiceRate,
    }));
  }, [agentVoiceUri, businessVoiceUri, voiceLanguage, voiceRate, voiceSettingsReady]);

  const speak = useCallback((text: string, speaker: "agent" | "business" | "system") => {
    if (muted || speaker === "system" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText(text, voiceLanguage));
    const preferredUri = speaker === "agent" ? agentVoiceUri : businessVoiceUri;
    const matching = voices.filter((voice) => voice.lang.toLowerCase().startsWith(voiceLanguage.slice(0, 2).toLowerCase()));
    const automatic = matching[speaker === "agent" ? 0 : Math.min(1, matching.length - 1)];
    utterance.voice = voices.find((voice) => voice.voiceURI === preferredUri) ?? automatic ?? null;
    utterance.lang = voiceLanguage;
    utterance.rate = speaker === "agent" ? Math.min(1.3, voiceRate + 0.05) : Math.max(0.75, voiceRate - 0.03);
    utterance.pitch = speaker === "agent" ? 1.03 : 0.88;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [agentVoiceUri, businessVoiceUri, muted, voiceLanguage, voiceRate, voices]);

  useEffect(() => () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  useEffect(() => {
    if (stage !== "running" || !result) return;
    if (speaking) return;
    const sessions = result.sessions;
    const current = sessions[activeIndex];
    if (!current) return;
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

  const runNegotiation = async (event?: FormEvent) => {
    event?.preventDefault();
    setError(null);
    setResult(null);
    setVisible({});
    setActiveIndex(0);
    setSelectedBusinessId(null);
    setHighlightTurnId(undefined);
    setComparing(false);
    setRequestOpen(false);
    spokenRef.current.clear();
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
      setRequestOpen(true);
    }
  };

  useEffect(() => {
    if (viewer === undefined || (!viewer && !guest) || demoBooted) return;
    demoBooted = true;
    void runNegotiation();
  }, [guest, viewer]);

  const openEvidence = (offer: Offer, key: string) => {
    if (!result) return;
    const session = result.sessions.find((item) => item.id === offer.sessionId);
    const turnId = offer.evidence[key]?.turnId;
    if (!session) return;
    setComparing(false);
    setSelectedBusinessId(session.businessId);
    if (turnId) setHighlightTurnId(turnId);
  };

  const databaseLabel = result
    ? result.databaseMode === "memory" ? "memory · not durable" : `${result.databaseMode} mongodb`
    : health?.database.ok
      ? health.database.mode === "memory" ? "memory · not durable" : `${health.database.mode} mongodb`
      : "checking mongodb";

  if (viewer === undefined) return <AuthScreen checking onAuthenticated={setViewer} onGuest={() => setGuest(true)} />;
  if (!viewer && !guest) return <AuthScreen onAuthenticated={setViewer} onGuest={() => setGuest(true)} />;

  const signOut = async () => {
    if (viewer) await fetch("/api/auth/logout", { method: "POST" });
    window.speechSynthesis?.cancel();
    setGuest(false);
    setViewer(null);
  };

  return (
    <OperatorBoard
      form={form}
      result={result}
      visible={visible}
      activeIndex={activeIndex}
      selectedBusinessId={selectedBusinessId}
      highlightTurnId={highlightTurnId}
      loading={stage === "running" && !result}
      speaking={speaking}
      muted={muted}
      comparing={comparing}
      requestOpen={requestOpen}
      error={error}
      realCallsConfigured={Boolean(health?.voice.realCallsConfigured)}
      databaseLabel={databaseLabel}
      viewerLabel={viewer?.name ?? "Judge demo"}
      voices={voices.map(({ name, lang, voiceURI }) => ({ name, lang, voiceURI }))}
      language={voiceLanguage}
      agentVoiceUri={agentVoiceUri}
      businessVoiceUri={businessVoiceUri}
      rate={voiceRate}
      onSelectBusiness={(businessId) => { setSelectedBusinessId(businessId); setHighlightTurnId(undefined); }}
      onHighlight={setHighlightTurnId}
      onMute={() => { setMuted((value) => !value); if (!muted) window.speechSynthesis?.cancel(); }}
      onSkip={() => window.speechSynthesis?.cancel()}
      onCompare={() => setComparing((value) => !value)}
      onOpenRequest={() => setRequestOpen(true)}
      onCloseRequest={() => setRequestOpen(false)}
      onChangeForm={setForm}
      onLanguage={(language) => { setVoiceLanguage(language); setAgentVoiceUri(""); setBusinessVoiceUri(""); }}
      onAgentVoice={setAgentVoiceUri}
      onBusinessVoice={setBusinessVoiceUri}
      onRate={setVoiceRate}
      onPreview={(speaker) => speak(speaker === "agent" ? "Hello, I am DealDAB. I will negotiate without making a purchase commitment." : "Our initial total is INR 13,600. We can deliver at 8:00 am.", speaker)}
      onSubmit={(event) => { void runNegotiation(event); }}
      onEvidenceOffer={openEvidence}
      onSignOut={() => { void signOut(); }}
    />
  );
}
