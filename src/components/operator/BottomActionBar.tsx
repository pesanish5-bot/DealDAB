import type { VendorLine } from "./model";

export function BottomActionBar({
  lines,
  status,
  nextAction,
  canCompare,
  comparing,
  onCompare,
}: {
  lines: VendorLine[];
  status: string;
  nextAction: string;
  canCompare: boolean;
  comparing: boolean;
  onCompare: () => void;
}) {
  const received = lines.filter((line) => line.phase === "received").length;
  const active = lines.filter((line) => line.phase === "negotiating" || line.phase === "calling").length;
  return (
    <footer className="actionBar">
      <div className="mixBar" aria-hidden="true">
        <i style={{ width: `${(active / Math.max(lines.length, 1)) * 100}%` }} />
        <i style={{ width: `${(received / Math.max(lines.length, 1)) * 100}%` }} />
        <i style={{ width: `${((lines.length - active - received) / Math.max(lines.length, 1)) * 100}%` }} />
      </div>
      <p>{status}</p>
      <span>Next action: {nextAction}</span>
      <button type="button" onClick={onCompare} disabled={!canCompare && !comparing}>{comparing ? "Return to active call" : "Compare available offers"} <b aria-hidden="true">→</b></button>
    </footer>
  );
}
