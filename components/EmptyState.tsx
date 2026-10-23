import Link from "next/link";
import { SearchX } from "lucide-react";

export default function EmptyState({
  title,
  description,
  resetHref,
}: {
  title: string;
  description: string;
  resetHref: string;
}) {
  return (
    <div className="empty-state" role="status">
      <SearchX size={30} strokeWidth={1.5} aria-hidden="true" />
      <div><h3>{title}</h3><p>{description}</p></div>
      <Link href={resetHref}>Reiniciar filtros</Link>
    </div>
  );
}
