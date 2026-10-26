"use client";

import { useRouter } from "next/navigation";
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useTransition,
} from "react";
import useDebounce from "@/hooks/useDebounce";

export default function FilterForm({
  action,
  children,
}: {
  action: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = useCallback((form: HTMLFormElement) => {
    const params = new URLSearchParams();
    for (const [key, raw] of new FormData(form)) {
      const value = String(raw).trim();
      if (!value || value === "all" || (key === "page" && value === "1")) continue;
      params.append(key, value);
    }
    startTransition(() => router.push(`${action}${params.size ? `?${params}` : ""}`, { scroll: false }));
  }, [action, router]);
  const debouncedNavigate = useDebounce(navigate, 300);
  return (
    <form
      action={action}
      className="nc-filters"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(event.currentTarget);
      }}
      onChange={(event) => {
        const form = event.currentTarget;
        const control = event.target as HTMLInputElement;
        if (control.tagName === "SELECT" || control.type === "checkbox")
          navigate(form);
        else debouncedNavigate(form);
      }}
    >
      {Children.map(children, (child) =>
        isValidElement<{ className?: string }>(child) && child.type === "label"
          ? cloneElement(child, {
              className: `${child.props.className?.includes("check")
                ? "nc-check"
                : child.props.className?.includes("search") ||
                    child.props.className?.includes("filter-query") ||
                    child.props.className?.includes("nc-filter-query")
                  ? "nc-field nc-filter-query"
                  : "nc-field"} ${child.props.className || ""}`.trim(),
            })
          : child,
      )}
      <noscript>
        <button className="nc-link" type="submit">
          Ver selección
        </button>
      </noscript>
      <span className="nc-sr" role="status">{pending ? "Actualizando resultados…" : ""}</span>
    </form>
  );
}
