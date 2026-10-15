import { inspectorModel, rupee } from "./model";

type Inspector = ReturnType<typeof inspectorModel>;

export function OfferInspector({
  model,
  requestLabel,
  persisted,
  onEvidence,
  onViewQuote,
}: {
  model: Inspector;
  requestLabel: string;
  persisted: string | null;
  onEvidence: (turnId: string) => void;
  onViewQuote: () => void;
}) {
  const quote = model.evidence.at(-1);
  return (
    <aside className="inspector" aria-label="Offer inspector">
      <header><h2>Offer inspector</h2><span>{model.businessName}</span></header>
      <dl className="priceStack">
        <div><dt>Initial offer</dt><dd>{model.initial !== null ? rupee(model.initial) : "—"}</dd></div>
        <div className="current"><dt>Current offer</dt><dd>{model.current !== null ? rupee(model.current) : "—"}</dd></div>
        <div><dt>Final offer</dt><dd className={model.final === null ? "pending" : ""}>{model.final !== null ? rupee(model.final) : "Awaiting call close"}</dd></div>
      </dl>
      {model.saved > 0 && model.initial !== null && model.current !== null && (
        <div className="savingsCard">
          <span>Saved so far</span>
          <strong>{rupee(model.saved)}</strong>
          <small>{rupee(model.initial)} → {rupee(model.current)} · {model.savedPercent}% below the opening quote</small>
        </div>
      )}
      <section>
        <h3>Benefits</h3>
        {model.benefits.length === 0 ? <p className="quiet">Included terms appear when the vendor states them.</p> : (
          <ul className="benefitList">
            {model.benefits.map((benefit) => <li key={benefit}><i aria-hidden="true">✓</i> {benefit}</li>)}
          </ul>
        )}
      </section>
      <section>
        <h3>Conditions</h3>
        {model.conditions.length === 0 ? <p className="quiet">Conditions appear when the vendor states them.</p> : (
          <ul className="conditionList">
            {model.conditions.map((condition) => <li key={condition}>{condition}</li>)}
          </ul>
        )}
        {model.complete && model.offer && !model.offer.eligible && (
          <p className="quiet warn">{model.offer.rejectionReasons.join(" ")}</p>
        )}
      </section>
      <section>
        <h3>Evidence</h3>
        <ul className="evidenceList">
          {model.evidence.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => onEvidence(item.id)}>
                <b>{item.code}</b>
                <span>{item.clock}</span>
                <em>{item.label}</em>
              </button>
            </li>
          ))}
        </ul>
        <button className="quoteButton" type="button" onClick={onViewQuote} disabled={!quote}>View quote · {model.businessName}{quote ? `, ${quote.clock}` : ""}</button>
      </section>
      {persisted && <p className="persisted"><i aria-hidden="true">✓</i> {persisted}</p>}
      <p className="demoFinePrint">Prices and statuses in this view come from a simulated call. No live provider telemetry is shown.</p>
      {requestLabel ? <p className="demoFinePrint requestFine">{requestLabel}</p> : null}
    </aside>
  );
}
