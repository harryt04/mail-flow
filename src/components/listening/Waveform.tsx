const BAR_HEIGHTS = ["60%", "100%", "45%", "85%", "55%"];

/** Continuous motion while TTS audio plays — the one exception to BRAND.md §7's no-bounce rule. */
export function Waveform({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-end justify-center gap-1.5 h-8 ${className}`} aria-hidden="true">
      {BAR_HEIGHTS.map((height, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-brand motion-safe:animate-[waveform_0.9s_ease-in-out_infinite]"
          style={{ height, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}
