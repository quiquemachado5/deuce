"use client";
import Form from "next/form";
import { useRef } from "react";
export default function FilterForm({
  action,
  children,
}: {
  action: string;
  children: React.ReactNode;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <Form
      action={action}
      className="filters"
      onChange={(e) => {
        const form = e.currentTarget;
        const input = e.target as HTMLInputElement;
        if (timer.current) clearTimeout(timer.current);
        if (input.tagName === "SELECT" || input.type === "checkbox")
          form.requestSubmit();
        else timer.current = setTimeout(() => form.requestSubmit(), 250);
      }}
    >
      {children}
      <noscript>
        <button className="text-button" type="submit">
          Ver selección
        </button>
      </noscript>
    </Form>
  );
}
