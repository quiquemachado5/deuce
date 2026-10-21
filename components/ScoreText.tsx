/** Keep each set and its tie-break together while allowing the match score to wrap. */
export default function ScoreText({ value }: { value: string }) {
  return (
    <span className="ds-score">
      {value.split(/,\s*/).map((set, index) => (
        <span key={`${index}-${set}`}>
          {index > 0 && ", "}
          <span className="ds-score-set">{set}</span>
        </span>
      ))}
    </span>
  );
}
