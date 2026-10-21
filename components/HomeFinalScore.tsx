import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Match } from "@/lib/types";
import { playerPhoto } from "@/lib/player-imagery";
import { playerSlug } from "@/lib/explore";
import { score } from "@/lib/cuaderno/model";

export default function HomeFinalScore({ match, context = "final" }: { match: Match; context?: string }) {
  const sets = match.score_summary.games;
  const formattedSets = score(match).split(", ");
  const names = [match.player1.name, match.player2.name];

  return (
    <div className="ds-final-table-scroll">
      <table className="ds-final-table" style={{ "--home-set-count": sets.length } as CSSProperties}>
        <caption className="nc-sr">Resultado del {context}: {names.join(" contra ")}, {score(match)}</caption>
        <thead><tr><th scope="col">Jugador</th><th scope="col">Sets</th>{sets.map((_, index) => <th scope="col" key={index}>{index + 1}</th>)}</tr></thead>
        <tbody>{names.map((name, side) => {
          const portrait = playerPhoto(name);
          const winner = match.winner === side + 1;
          const setsWon = sets.filter((set) => set[side] > set[1 - side]).length;
          return <tr key={name} className={winner ? "ds-final-table-winner" : undefined}>
            <th scope="row"><Link href={`/players/${playerSlug(name)}`}>
              {portrait && <Image src={portrait.thumbnail || portrait.src} width={40} height={40} sizes="40px" alt="" unoptimized />}
              <span><span>{name}</span>{winner && <small>Ganador</small>}</span>
            </Link></th>
            <td className="ds-final-table-total">{setsWon}</td>
            {sets.map((set, index) => {
              const tie = formattedSets[index]?.match(/\((\d+)\)/);
              const lostSet = set[side] < set[1 - side];
              return <td key={index} className={lostSet ? undefined : "ds-final-table-set-won"}>{set[side]}{tie && lostSet && <small>({tie[1]})</small>}</td>;
            })}
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}
