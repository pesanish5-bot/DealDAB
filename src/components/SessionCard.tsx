import type { NegotiationSession, SessionStatus } from "@/lib/types";

const statusLabel: Record<SessionStatus, string> = {
  waiting: "Waiting",
  calling: "Calling",
  connected: "Connected",
  getting_offer: "Getting offer",
  negotiating: "Negotiating",
  validating: "Validating",
  completed: "Completed",
  failed: "Call failed",
};

export function SessionCard({
  session,
  visibleTurns,
  active,
  onOpen,
}: {
  session: NegotiationSession;
  visibleTurns: number;
  active: boolean;
  onOpen: () => void;
}) {
  const status: SessionStatus = session.status === "failed"
    ? "failed"
    : visibleTurns === 0
      ? "calling"
      : visibleTurns === 1
        ? "connected"
        : visibleTurns < session.transcript.length
          ? visibleTurns < 3 ? "getting_offer" : "negotiating"
          : "completed";
  const latest = session.transcript[Math.max(0, visibleTurns - 1)];
  const progress = session.transcript.length ? Math.round((visibleTurns / session.transcript.length) * 100) : 0;

  return (
    <article className={`sessionCard ${active ? "active" : ""} ${status === "failed" ? "failed" : ""}`}>
      <div className="sessionTop">
        <div className="vendorAvatar" aria-hidden="true">{session.businessName.charAt(0)}</div>
        <div>
          <h3>{session.businessName}</h3>
          <p>Fictional printing vendor</p>
        </div>
        <span className={`status ${status}`}><i />{statusLabel[status]}</span>
      </div>
      <div className="progressTrack"><span style={{ width: `${progress}%` }} /></div>
      <div className="liveCaption" aria-live="polite">
        {latest ? (
          <><small>{latest.speaker === "business" ? "VENDOR" : latest.speaker === "agent" ? "DEALDAB" : "SYSTEM"}</small><p>“{latest.text}”</p></>
        ) : <p className="muted">Opening the voice session…</p>}
      </div>
      <button className="textButton" type="button" onClick={onOpen}>Open transcript <span>↗</span></button>
    </article>
  );
}
