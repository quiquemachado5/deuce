import type { Match } from "@/lib/types";

export default function MatchStatusBadge({ status }: Pick<Match, "status">) {
  const cancelled = /walkover|cancelled/i.test(status);
  const finished = status === "Finished" || /retired|abandoned/i.test(status);
  const label = cancelled ? "Sin jugar" : finished ? "Finalizado" : "En directo";
  return (
    <span className="match-status-badge" data-live={!finished && !cancelled ? "true" : undefined}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
