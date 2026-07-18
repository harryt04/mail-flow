import { IconMic } from "@/components/ui/icons";

/** Pulsing ring around the mic icon — shown during a checkpoint's listening window (BRAND.md §6). */
export function ListeningRing({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center w-14 h-14 ${className}`}>
      <span className="absolute inset-0 rounded-full border-2 border-attention motion-safe:animate-[pulse-ring_1.6s_ease-out_infinite]" />
      <IconMic className="w-7 h-7" />
    </div>
  );
}
