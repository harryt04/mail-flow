const BAR_HEIGHTS = ['60%', '100%', '45%', '85%', '55%']

/** Continuous motion while TTS audio plays — the one exception to BRAND.md §7's no-bounce rule. */
export function Waveform({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex h-8 items-end justify-center gap-1.5 ${className}`}
      aria-hidden="true"
    >
      {BAR_HEIGHTS.map((height, i) => (
        <span
          key={i}
          className="bg-brand w-1.5 rounded-full motion-safe:animate-[waveform_0.9s_ease-in-out_infinite]"
          style={{ height, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )
}
