import type { Match } from "@/lib/types";
import { score, round } from "@/lib/cuaderno/model";
import { tournamentName } from "@/lib/labels";
export default function Og({ match }: { match?: Match }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: 64,
        background: "#f3efe6",
        color: "#141414",
      }}
    >
      <div style={{ display: "flex", fontSize: 24, letterSpacing: 4 }}>
        DEUCE
      </div>
      {match ? (
        <>
          <div style={{ display: "flex", fontSize: 24, marginTop: 40 }}>
            {tournamentName(match.tournament)} · {match.year} · {round(match)}
          </div>
          <div style={{ display: "flex", fontSize: 56, marginTop: 24 }}>
            {match.player1.name}
          </div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 8 }}>
            contra {match.player2.name}
          </div>
          <div style={{ display: "flex", fontSize: 48, marginTop: 40 }}>
            {score(match)}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", fontSize: 64, marginTop: 40 }}>
          El partido, leído.
        </div>
      )}
    </div>
  );
}
