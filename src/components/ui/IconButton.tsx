import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui-style cva icon button — the equivalent of shadcn's `Button size="icon"`,
// kept as its own component because BRAND.md §5/§9 requires an explicit accessible
// label on every icon-only control and a distinct large "mic control" size (88px).
const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full transition-colors duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-surface border border-border text-text-primary hover:bg-surface-sunken",
        primary: "bg-brand text-on-accent hover:bg-brand-strong",
      },
      size: {
        md: "w-11 h-11",
        lg: "w-22 h-22",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: React.ReactNode;
  label: string;
}

// Icon-only controls always require an accessible label (BRAND.md §9 checklist).
function IconButton({ icon, label, variant, size, className, ...props }: IconButtonProps) {
  return (
    <button
      data-slot="icon-button"
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ variant, size, className }))}
      {...props}
    >
      {icon}
    </button>
  );
}

export { IconButton, iconButtonVariants };
