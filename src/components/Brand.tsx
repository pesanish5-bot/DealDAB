export function Brand() {
  return (
    <div className="brand" aria-label="BidWise AI home">
      <span className="brandMark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>BidWise <b>AI</b></span>
    </div>
  );
}

export function SimulationPill() {
  return <span className="simPill"><span aria-hidden="true">●</span> Safe demo · simulated vendors</span>;
}
