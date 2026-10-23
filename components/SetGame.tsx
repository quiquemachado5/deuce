export default function SetGame({ games, tieBreak }: { games: number; tieBreak?: string }) {
  return <span className="score-game">{games}{tieBreak ? <sup className="score-tiebreak">{tieBreak}</sup> : null}</span>;
}
