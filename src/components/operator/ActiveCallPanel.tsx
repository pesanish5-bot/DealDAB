import type { PipelineStep } from "./model";

export function ActiveCallPanel({
  vendor,
  clock,
  speaking,
  paused,
  steps,
  strategy,
  muted,
  onMute,
  onSkip,
}: {
  vendor: string;
  clock: string;
  speaking: boolean;
  paused: boolean;
  steps: PipelineStep[];
  strategy: string;
  muted: boolean;
  onMute: () => void;
  onSkip: () => void;
}) {
  const active = steps.find((step) => step.state === "active");
  return (
    <section className="callStack" aria-label="Active call">
      <div className="callCard">
        <div className="callCardTop">
          <div className="callParties">
            <span className="party"><i className="partyMark agent" aria-hidden="true" /> DealDAB</span>
            <span className="partySwap" aria-hidden="true">⇄</span>
            <span className="party"><i className="partyMark vendor" aria-hidden="true" /> {vendor}</span>
            <em>simulated line</em>
          </div>
          <div className="callStatus">
            <b>{active?.label ?? "Negotiating"}</b>
            <strong>{clock}</strong>
            <small>Demo playback</small>
          </div>
        </div>
        <div className="activityRow">
          <div className={`waveform ${speaking ? "live" : "paused"}`} aria-hidden="true">
            {Array.from({ length: 28 }, (_, index) => <span key={index} style={{ animationDelay: `${(index % 7) * 0.12}s` }} />)}
          </div>
          <p>{speaking ? "Simulated call activity · browser speech is playing. These bars are not live phone levels." : `Simulated call activity · playback ${paused ? "paused" : "holding"} at ${clock}, no live audio levels shown.`}</p>
          <div className="callVoice">
            <button type="button" onClick={onMute} aria-pressed={muted}>{muted ? "Unmute" : "Mute"}</button>
            <button type="button" onClick={onSkip} disabled={!speaking}>Skip voice</button>
          </div>
        </div>
      </div>
      <ol className="pipeline" aria-label="Call stage">
        {steps.map((step) => (
          <li key={step.id} className={step.state}>
            <span><i aria-hidden="true">{step.state === "done" ? "✓" : ""}</i>{step.label}</span>
            <b />
          </li>
        ))}
      </ol>
      <div className="strategyCard">
        <span>Current strategy</span>
        <p>{strategy}</p>
      </div>
    </section>
  );
}
