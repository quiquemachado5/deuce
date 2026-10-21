/** Tie-break points never alter the games' baseline. */
export default function ScoreText({ value }: { value: string }) {
  return <span className="ds-score" role="img" aria-label={value}>{value.split(/[,\s]+/).filter(Boolean).map((set,i) => {
    const parts = set.match(/^(.+?)\((\d+)\)$/);
    return <span className="ds-score-set" key={i} aria-hidden="true">{parts ? <>{parts[1]}<sup>{parts[2]}</sup></> : set}</span>;
  })}</span>;
}
