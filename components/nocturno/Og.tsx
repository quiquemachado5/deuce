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
        background: "#f5f5f7",
        color: "#111111",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 20,
          letterSpacing: 0,
          fontWeight: 600,
          color: "#111111",
        }}
      >
        DEUCE
      </div>
      {match ? (
        <>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              marginTop: 48,
              color: "#64646a",
            }}
          >
            {tournamentName(match.tournament)} · {match.year} · {round(match)}
          </div>
          <div style={{ display: "flex", fontSize: 56, marginTop: 24 }}>
            {match.player1.name}
          </div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 8 }}>
            contra {match.player2.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 48,
              marginTop: 48,
              color: "#111111",
            }}
          >
            {score(match)}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", fontSize: 64, marginTop: 48 }}>
          Grand Slams y Masters, leídos por el dato.
        </div>
      )}
    </div>
  );
}
