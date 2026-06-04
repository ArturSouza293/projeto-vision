"use client";

import { useEffect, useRef } from "react";

/**
 * Returns a ref for a list container; when `count` grows (an item was added),
 * the newly appended last child is scrolled into view. Keeps long editors usable
 * — the new row never lands below the fold.
 */
export function useScrollOnAdd<T extends HTMLElement>(count: number) {
  const ref = useRef<T>(null);
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current) {
      ref.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    prev.current = count;
  }, [count]);
  return ref;
}
