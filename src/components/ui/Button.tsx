import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-brand text-on-accent hover:bg-brand-strong",
  secondary: "bg-surface text-text-primary border border-border hover:bg-surface-sunken",
  danger: "bg-danger text-on-accent hover:opacity-90",
  ghost: "bg-transparent text-brand hover:bg-surface-sunken",
};

// BRAND.md §5: 56px min for primary voice-command fallback buttons, 44px elsewhere.
const SIZE_CLASSES: Record<Size, string> = {
  md: "min-h-11 px-6 text-body",
  lg: "min-h-14 px-8 text-body-lg font-semibold",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-pill transition-colors duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
