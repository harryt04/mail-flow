import { IconButton } from '@/components/ui/IconButton'
import {
  IconSkip,
  IconArchive,
  IconReply,
  IconSnooze,
  IconPlay,
  IconFolder,
} from '@/components/ui/icons'

interface ManualControlsProps {
  onSkip: () => void
  onArchive: () => void
  onSnooze: () => void
  onReply: () => void
  onMove: () => void
  onContinue?: () => void
  showContinue?: boolean
  disabled?: boolean
}

/** Fallback for when voice isn't practical — mirrors the exact icon+color vocabulary of the voice-command states (BRAND.md §6). */
export function ManualControls({
  onSkip,
  onArchive,
  onSnooze,
  onReply,
  onMove,
  onContinue,
  showContinue = false,
  disabled,
}: ManualControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {showContinue && onContinue && (
        <div className="flex flex-col items-center gap-2">
          <IconButton
            icon={<IconPlay className="h-6 w-6" />}
            label="Continue Reading"
            variant="primary"
            size="lg"
            onClick={onContinue}
            disabled={disabled}
          />
          <span className="text-label text-text-secondary uppercase">
            Continue
          </span>
        </div>
      )}
      <div className="flex flex-col items-center gap-2">
        <IconButton
          icon={<IconSkip className="h-6 w-6" />}
          label="Skip"
          size="lg"
          onClick={onSkip}
          disabled={disabled}
        />
        <span className="text-label text-text-secondary uppercase">Skip</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton
          icon={<IconArchive className="h-6 w-6" />}
          label="Archive"
          size="lg"
          onClick={onArchive}
          disabled={disabled}
        />
        <span className="text-label text-text-secondary uppercase">
          Archive
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton
          icon={<IconReply className="h-6 w-6" />}
          label="Reply"
          size="lg"
          onClick={onReply}
          disabled={disabled}
        />
        <span className="text-label text-text-secondary uppercase">Reply</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton
          icon={<IconSnooze className="h-6 w-6" />}
          label="Snooze"
          size="lg"
          onClick={onSnooze}
          disabled={disabled}
        />
        <span className="text-label text-text-secondary uppercase">Snooze</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconButton
          icon={<IconFolder className="h-6 w-6" />}
          label="Move to folder"
          size="lg"
          onClick={onMove}
          disabled={disabled}
        />
        <span className="text-label text-text-secondary uppercase">
          Move to
        </span>
      </div>
    </div>
  )
}
