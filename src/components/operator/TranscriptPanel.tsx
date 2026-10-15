"use client";

import { useEffect, useRef } from "react";
import type { TranscriptTurn } from "@/lib/types";
import { chipLabel, clockFromSequence } from "./model";

export function TranscriptPanel({
  vendor,
  turns,
  highlightTurnId,
  footer,
  onEvidence,
}: {
  vendor: string;
  turns: TranscriptTurn[];
  highlightTurnId?: string;
  footer: string;
  onEvidence: (turnId: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const target = root.querySelector(".turnRow.highlight") ?? root.querySelector(".turnRow:last-of-type");
    target?.scrollIntoView({ block: "nearest" });
  }, [turns.length, highlightTurnId]);

  let evidenceCount = 0;
  return (
    <section className="transcriptCard" aria-label={`Call transcript ${vendor}`}>
      <header>
        <h2>Call transcript · {vendor} <em>Simulated</em></h2>
        <span>Speakers, timestamps and quoted evidence</span>
      </header>
      <div className="transcriptLog" ref={scroller}>
        {turns.length === 0 && <p className="transcriptEmpty">The simulated line has not spoken yet.</p>}
        {turns.map((turn) => {
          const isBusiness = turn.speaker === "business";
          const code = isBusiness ? `E${String(++evidenceCount).padStart(2, "0")}` : "";
          return (
            <article key={turn.id} id={`turn-${turn.id}`} className={`turnRow ${turn.speaker} ${turn.id === highlightTurnId ? "highlight" : ""}`}>
              <time>{clockFromSequence(turn.sequence)}</time>
              <div>
                <b>{turn.speaker === "agent" ? "DealDAB" : turn.speaker === "business" ? vendor : "System"}</b>
                <p>{turn.text.replaceAll("INR ", "₹")}</p>
              </div>
              {isBusiness && (
                <button type="button" className="evidenceChip" onClick={() => onEvidence(turn.id)}>{code} {chipLabel(turn.text)}</button>
              )}
            </article>
          );
        })}
      </div>
      <footer><i aria-hidden="true" /> {footer}</footer>
    </section>
  );
}
