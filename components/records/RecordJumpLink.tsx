"use client";

import type { MouseEvent, ReactNode } from "react";

export default function RecordJumpLink({
  recordId,
  className,
  children,
}: {
  recordId: string;
  className?: string;
  children: ReactNode;
}) {
  const href = `#record-${recordId}`;

  const reveal = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(`record-${recordId}`);
    if (!target) return;
    event.preventDefault();
    const disclosure = target.closest("details");
    if (disclosure) disclosure.open = true;
    history.replaceState(null, "", href);
    requestAnimationFrame(() =>
      target.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  return (
    <a className={className} href={href} onClick={reveal}>
      {children}
    </a>
  );
}
