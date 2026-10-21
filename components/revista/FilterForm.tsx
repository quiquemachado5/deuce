"use client";

import Form from "next/form";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
} from "react";

export default function FilterForm({
  action,
  children,
}: {
  action: string;
  children: React.ReactNode;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <Form
      action={action}
      scroll={false}
      className="nc-filters"
      onSubmit={() => {
        if (timer.current) clearTimeout(timer.current);
      }}
      onChange={(event) => {
        const form = event.currentTarget;
        const control = event.target as HTMLInputElement;
        if (timer.current) clearTimeout(timer.current);
        if (control.tagName === "SELECT" || control.type === "checkbox")
          form.requestSubmit();
        else timer.current = setTimeout(() => form.requestSubmit(), 250);
      }}
    >
      {Children.map(children, (child) =>
        isValidElement<{ className?: string }>(child) && child.type === "label"
          ? cloneElement(child, {
              className: child.props.className?.includes("check")
                ? "nc-check"
                : child.props.className?.includes("search") ||
                    child.props.className?.includes("filter-query") ||
                    child.props.className?.includes("nc-filter-query")
                  ? "nc-field nc-filter-query"
                  : "nc-field",
            })
          : child,
      )}
      <noscript>
        <button className="nc-link" type="submit">
          Ver selección
        </button>
      </noscript>
    </Form>
  );
}
