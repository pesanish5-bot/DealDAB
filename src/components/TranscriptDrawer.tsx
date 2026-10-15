import { useEffect } from "react";
import type { NegotiationSession } from "@/lib/types";

export function TranscriptDrawer({
  session,
  highlightTurnId,
  onClose,
}: {
  session: NegotiationSession | null;
  highlightTurnId?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!session || !highlightTurnId) return;
    const timer = window.setTimeout(() => document.getElementById(`turn-${highlightTurnId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
    return () => window.clearTimeout(timer);
  }, [session, highlightTurnId]);

  if (!session) return null;
  return (
    <div className="drawerBackdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="transcript-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawerHead">
          <div><span className="eyebrow">Evidence transcript</span><h2 id="transcript-title">{session.businessName}</h2></div>
          <button className="closeButton" type="button" onClick={onClose} aria-label="Close transcript">×</button>
        </div>
        <div className="truthNotice">SIMULATED CALL · Generated for demonstration, not a recording of a real business.</div>
        <div className="transcript">
          {session.transcript.map((turn) => (
            <div id={`turn-${turn.id}`} key={turn.id} className={`turn ${turn.speaker} ${turn.id === highlightTurnId ? "highlight" : ""}`}>
              <div className="turnMeta"><b>{turn.speaker === "agent" ? "DealDAB agent" : turn.speaker === "business" ? session.businessName : "System"}</b><span>#{turn.sequence}</span></div>
              <p>{turn.text}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
