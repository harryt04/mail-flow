import { IconButton } from '@/components/ui/IconButton'
import {
  IconSkip,
  IconArchive,
  IconReply,
  IconPlay,
  IconFolder,
} from '@/components/ui/icons'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

interface ManualControlsProps {
  onSkip: () => void
  onArchive: () => void
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
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                icon={<IconPlay className="h-6 w-6" />}
                label="Continue Reading"
                variant="primary"
                size="lg"
                onClick={onContinue}
                disabled={disabled}
              />
            </TooltipTrigger>
            <TooltipContent>Keep reading this email</TooltipContent>
          </Tooltip>
          <span className="text-label text-text-secondary uppercase">
            Continue
          </span>
        </div>
      )}
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              icon={<IconSkip className="h-6 w-6" />}
              label="Skip"
              size="lg"
              onClick={onSkip}
              disabled={disabled}
            />
          </TooltipTrigger>
          <TooltipContent>Mark as read, keep in inbox</TooltipContent>
        </Tooltip>
        <span className="text-label text-text-secondary uppercase">Skip</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              icon={<IconArchive className="h-6 w-6" />}
              label="Archive"
              size="lg"
              onClick={onArchive}
              disabled={disabled}
            />
          </TooltipTrigger>
          <TooltipContent>Remove from inbox</TooltipContent>
        </Tooltip>
        <span className="text-label text-text-secondary uppercase">
          Archive
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              icon={<IconReply className="h-6 w-6" />}
              label="Reply"
              size="lg"
              onClick={onReply}
              disabled={disabled}
            />
          </TooltipTrigger>
          <TooltipContent>Dictate a reply</TooltipContent>
        </Tooltip>
        <span className="text-label text-text-secondary uppercase">Reply</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              icon={<IconFolder className="h-6 w-6" />}
              label="Move to folder"
              size="lg"
              onClick={onMove}
              disabled={disabled}
            />
          </TooltipTrigger>
          <TooltipContent>File into a Gmail label</TooltipContent>
        </Tooltip>
        <span className="text-label text-text-secondary uppercase">
          Move to
        </span>
      </div>
    </div>
  )
}
