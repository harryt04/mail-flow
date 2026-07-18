import { IconMic } from '@/components/ui/icons'

/** Pulsing ring around the mic icon — shown during a checkpoint's listening window (BRAND.md §6). */
export function ListeningRing({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex h-14 w-14 items-center justify-center ${className}`}
    >
      <span className="border-attention absolute inset-0 rounded-full border-2 motion-safe:animate-[pulse-ring_1.6s_ease-out_infinite]" />
      <IconMic className="h-7 w-7" />
    </div>
  )
}
