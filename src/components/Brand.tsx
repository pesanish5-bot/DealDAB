export function Brand() {
  return (
    <div className="brand" aria-label="DealDAB home">
      <span className="brandMark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>DealDAB</span>
    </div>
  );
}

export function SimulationPill() {
  return <span className="simPill"><span aria-hidden="true">●</span> Safe demo · simulated vendors</span>;
}
