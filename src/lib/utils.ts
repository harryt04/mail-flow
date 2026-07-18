import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Default tailwind-merge doesn't know this app's custom @theme tokens
// (src/app/globals.css), so it can't tell a font-size utility like
// `text-h1` apart from a color utility like `text-on-accent` — both look
// like unrecognized `text-*` classes to it, and it silently drops whichever
// came first when both appear together (e.g. Button.tsx's `text-on-accent`
// variant class + `text-body-lg` size class), breaking button text contrast.
// Registering the token names here restores correct conflict resolution.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "hero", "h1", "h2", "body-lg", "body", "meta", "label"] },
      ],
      "text-color": [
        {
          text: [
            "primary",
            "secondary",
            "muted",
            "brand",
            "brand-strong",
            "positive",
            "attention",
            "danger",
            "on-accent",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
