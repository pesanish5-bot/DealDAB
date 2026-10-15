import type { VendorLine } from "./model";

const phaseLabel: Record<VendorLine["phase"], string> = {
  negotiating: "Negotiating",
  calling: "Calling",
  received: "Offer received",
  waiting: "Waiting",
  failed: "No answer",
};

export function VendorLineList({ lines, onSelect }: { lines: VendorLine[]; onSelect: (businessId: string) => void }) {
  return (
    <aside className="lineColumn" aria-label="Business lines">
      <div className="lineColumnHead"><span>Lines</span><b>{lines.length} businesses</b></div>
      <div className="lineList">
        {lines.map((line) => (
          <button key={line.businessId} type="button" className={`vendorCard phase-${line.phase} ${line.selected ? "selected" : ""}`} onClick={() => onSelect(line.businessId)} aria-pressed={line.selected}>
            <span className="vendorCardTop">
              <span>
                <strong>{line.name}</strong>
                <small>{line.detail}</small>
              </span>
              <em className={`phaseTag phase-${line.phase}`}>{phaseLabel[line.phase]}</em>
            </span>
            <span className="vendorPriceBlock">
              <small>{line.priceLabel}</small>
              <b>{line.price ?? (line.phase === "waiting" ? "Awaiting offer" : "—")}</b>
            </span>
            {(line.phase === "negotiating" || line.phase === "calling") && (
              <span className="vendorTrack" aria-hidden="true"><i style={{ width: `${Math.max(8, line.progress * 100)}%` }} /></span>
            )}
            <small className="vendorNote">{line.note}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}
