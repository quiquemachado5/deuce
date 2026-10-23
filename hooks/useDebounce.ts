"use client";

import { useCallback, useEffect, useRef } from "react";

export default function useDebounce<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 250,
) {
  const latest = useRef(callback);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (...args: TArgs) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => latest.current(...args), delay);
    },
    [delay],
  );
}
