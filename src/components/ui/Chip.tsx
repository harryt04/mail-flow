import type { ReactNode } from "react";

export type ChipTone = "brand" | "positive" | "attention" | "danger" | "neutral";

interface ChipProps {
  tone: ChipTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<ChipTone, string> = {
  brand: "bg-brand/10 text-brand",
  positive: "bg-positive/10 text-positive",
  attention: "bg-attention/10 text-attention",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-surface-sunken text-text-secondary",
};

// BRAND.md §3.4 rule 1: color is never the only signal — icon + label always accompany tone.
export function Chip({ tone, icon, children, className = "" }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill px-4 py-2 text-label uppercase tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
