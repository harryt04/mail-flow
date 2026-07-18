import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card bg-surface border border-border p-6 shadow-[var(--shadow-soft)] ${className}`}
      {...props}
    />
  );
}
