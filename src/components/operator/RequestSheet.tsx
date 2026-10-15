"use client";

import type { FormEvent } from "react";
import { VoiceStudio } from "@/components/VoiceStudio";
import type { SpokenLanguage } from "@/lib/speech";
import type { RequestInput } from "@/lib/types";

type VoiceOption = { name: string; lang: string; voiceURI: string };

export function RequestSheet({
  open,
  form,
  error,
  realCallsConfigured,
  voices,
  language,
  agentVoiceUri,
  businessVoiceUri,
  rate,
  onClose,
  onChange,
  onLanguage,
  onAgentVoice,
  onBusinessVoice,
  onRate,
  onPreview,
  onSubmit,
}: {
  open: boolean;
  form: RequestInput;
  error: string | null;
  realCallsConfigured: boolean;
  voices: VoiceOption[];
  language: SpokenLanguage;
  agentVoiceUri: string;
  businessVoiceUri: string;
  rate: number;
  onClose: () => void;
  onChange: (form: RequestInput) => void;
  onLanguage: (language: SpokenLanguage) => void;
  onAgentVoice: (uri: string) => void;
  onBusinessVoice: (uri: string) => void;
  onRate: (rate: number) => void;
  onPreview: (speaker: "agent" | "business") => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!open) return null;
  return (
    <div className="sheetBackdrop" role="presentation" onClick={onClose}>
      <form className="requestSheet" onClick={(event) => event.stopPropagation()} onSubmit={onSubmit}>
        <header>
          <div><span>Request</span><h2>College event printing</h2></div>
          <button type="button" onClick={onClose} aria-label="Close request">×</button>
        </header>
        <p className="sheetMode">Safe voice demo is active. Real phone calls are not placed{realCallsConfigured ? " even though Vapi credentials are present" : ""}.</p>
        <VoiceStudio
          voices={voices}
          language={language}
          agentVoiceUri={agentVoiceUri}
          businessVoiceUri={businessVoiceUri}
          rate={rate}
          onLanguage={onLanguage}
          onAgentVoice={onAgentVoice}
          onBusinessVoice={onBusinessVoice}
          onRate={onRate}
          onPreview={onPreview}
        />
        <label>Delivery location<input value={form.location} onChange={(event) => onChange({ ...form, location: event.target.value })} required /></label>
        <label>Delivery deadline
          <input
            type="datetime-local"
            value={form.deliveryDeadline.slice(0, 16)}
            onChange={(event) => onChange({ ...form, deliveryDeadline: `${event.target.value}:00+05:30` })}
            required
          />
        </label>
        <div className="sheetItems">
          {form.lineItems.map((item, index) => (
            <div key={`${index}-${item.name}`}>
              <input
                aria-label={`Quantity ${index + 1}`}
                type="number"
                min={1}
                value={item.quantity}
                onChange={(event) => onChange({
                  ...form,
                  lineItems: form.lineItems.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: Number(event.target.value) } : line),
                })}
                required
              />
              <input
                aria-label={`Item ${index + 1}`}
                value={item.name}
                onChange={(event) => onChange({
                  ...form,
                  lineItems: form.lineItems.map((line, lineIndex) => lineIndex === index ? { ...line, name: event.target.value } : line),
                })}
                required
              />
              <button
                type="button"
                disabled={form.lineItems.length === 1}
                onClick={() => onChange({ ...form, lineItems: form.lineItems.filter((_, lineIndex) => lineIndex !== index) })}
              >Remove</button>
            </div>
          ))}
        </div>
        <button
          className="sheetAdd"
          type="button"
          onClick={() => onChange({ ...form, lineItems: [...form.lineItems, { name: "", quantity: 1 }] })}
        >Add item</button>
        <fieldset className="constraintToggles">
          <legend>Hard requirements</legend>
          {([
            ["complete_quantity", "Complete quantity"],
            ["deadline", "Deadline"],
            ["digital_proof", "Digital proof"],
          ] as const).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={form.hardConstraints.includes(key)}
                onChange={(event) => onChange({
                  ...form,
                  hardConstraints: event.target.checked
                    ? [...form.hardConstraints, key]
                    : form.hardConstraints.filter((constraint) => constraint !== key),
                })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="sheetPrices">
          <label>Target price ₹<input type="number" min={1} value={form.targetPriceInr} onChange={(event) => onChange({ ...form, targetPriceInr: Number(event.target.value) })} required /></label>
          <label>Hard maximum ₹<input type="number" min={1} value={form.maximumPriceInr} onChange={(event) => onChange({ ...form, maximumPriceInr: Number(event.target.value) })} required /></label>
        </div>
        <div className="weightGrid">
          {(
            [
              ["price", "Price"],
              ["specificationMatch", "Spec match"],
              ["evidenceConfidence", "Evidence"],
              ["benefits", "Benefits"],
              ["negotiationGain", "Negotiation"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>{label}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={form.preferences[key]}
                onChange={(event) => onChange({ ...form, preferences: { ...form.preferences, [key]: Number(event.target.value) } })}
              />
              <b>{form.preferences[key].toFixed(2)}</b>
            </label>
          ))}
        </div>
        {error && <p className="sheetError" role="alert">{error}</p>}
        <button className="sheetSubmit" type="submit">Start voice negotiations</button>
        <p className="sheetNote">Runs against three fictional vendors. No real calls or commitments are made.</p>
      </form>
    </div>
  );
}
