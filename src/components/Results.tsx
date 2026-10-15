import type { NegotiationResult, Offer } from "@/lib/types";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function Results({ result, onEvidence }: { result: NegotiationResult; onEvidence: (offer: Offer, key: string) => void }) {
  const sorted = [...result.offers].sort((a, b) => {
    const rankA = result.recommendation.rankedOfferIds.indexOf(a.id);
    const rankB = result.recommendation.rankedOfferIds.indexOf(b.id);
    return (rankA < 0 ? 99 : rankA) - (rankB < 0 ? 99 : rankB);
  });
  const winner = result.offers.find((offer) => offer.id === result.recommendation.winningOfferId);
  return (
    <section className="results" aria-labelledby="results-heading">
      <div className="sectionHeading">
        <div><span className="eyebrow">Transparent comparison</span><h2 id="results-heading">Three calls. One defensible decision.</h2></div>
        <span className="auditBadge">✓ Evidence validated</span>
      </div>
      <div className="comparisonGrid">
        {sorted.map((offer, index) => (
          <article key={offer.id} className={`offerCard ${offer.id === winner?.id ? "winner" : ""} ${!offer.eligible ? "rejected" : ""}`}>
            {offer.id === winner?.id && <div className="winnerRibbon">★ BEST MATCH</div>}
            {!offer.eligible && <div className="rejectedRibbon">INELIGIBLE</div>}
            <div className="offerTitle"><span>0{index + 1}</span><h3>{offer.businessName}</h3></div>
            <div className="priceRow"><div><small>INITIAL</small><s>{money(offer.initialPriceInr)}</s></div><span>→</span><div><small>FINAL OFFER</small><strong>{money(offer.finalPriceInr)}</strong></div></div>
            <div className="saving">Saved {money(offer.savingsInr)} · {offer.savingsPercent}%</div>
            <dl className="offerFacts">
              <div><dt>Delivery</dt><dd>{new Date(offer.deliveryAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</dd></div>
              <div><dt>Includes</dt><dd>{offer.benefits.join(" · ")}</dd></div>
            </dl>
            {!offer.eligible ? <div className="reasons">{offer.rejectionReasons.map((reason) => <p key={reason}>× {reason}</p>)}</div> : <div className="score"><b>{offer.score?.toFixed(1)}</b><span>/ 100<br />value score</span></div>}
            <button className="evidenceButton" type="button" onClick={() => onEvidence(offer, "finalPrice")}>View final-price evidence <span>↗</span></button>
          </article>
        ))}
      </div>

      {winner ? (
        <article className="recommendation">
          <div className="recCopy">
            <span className="eyebrow light">BidWise recommendation</span>
            <h2><span>🏆</span> {winner.businessName}</h2>
            <p>{result.recommendation.explanation}</p>
            <div className="recStats">
              <div><small>FINAL PRICE</small><b>{money(winner.finalPriceInr)}</b></div>
              <div><small>YOU SAVE</small><b>{money(winner.savingsInr)}</b></div>
              <div><small>CONFIDENCE</small><b>{Math.round(winner.confidence * 100)}%</b></div>
            </div>
            <button className="primaryButton inverse" type="button" onClick={() => onEvidence(winner, "finalPrice")}>Open supporting evidence <span>↗</span></button>
          </div>
          <div className="scorePanel">
            <div className="scoreCircle"><b>{winner.score?.toFixed(1)}</b><span>overall</span></div>
            <h3>Score breakdown</h3>
            {winner.scoreBreakdown && Object.entries(winner.scoreBreakdown).map(([key, value]) => (
              <div className="scoreBar" key={key}><div><span>{key.replace(/([A-Z])/g, " $1")}</span><b>{Math.round(value)}</b></div><i><em style={{ width: `${value}%` }} /></i></div>
            ))}
            <p className="formulaNote">Calculated from validated fields. The AI cannot override hard constraints or the score.</p>
          </div>
        </article>
      ) : <div className="emptyRecommendation"><h3>No defensible recommendation</h3><p>Every completed offer failed a hard constraint or lacked evidence.</p></div>}
    </section>
  );
}
