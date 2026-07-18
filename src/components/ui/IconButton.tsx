import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: "default" | "primary";
  size?: "md" | "lg";
}

// Icon-only controls always require an accessible label (BRAND.md §9 checklist).
export function IconButton({
  icon,
  label,
  variant = "default",
  size = "md",
  className = "",
  ...props
}: IconButtonProps) {
  const sizeClasses = size === "lg" ? "w-22 h-22" : "w-11 h-11";
  const variantClasses =
    variant === "primary"
      ? "bg-brand text-on-accent hover:bg-brand-strong"
      : "bg-surface border border-border text-text-primary hover:bg-surface-sunken";

  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-full transition-colors duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
