import { useTranslations } from 'next-intl'
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
  const t = useTranslations('manualControls')

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {showContinue && onContinue && (
        <div className="flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                icon={<IconPlay className="h-6 w-6" />}
                label={t('continueReading')}
                variant="primary"
                size="lg"
                onClick={onContinue}
                disabled={disabled}
              />
            </TooltipTrigger>
            <TooltipContent>{t('keepReadingTooltip')}</TooltipContent>
          </Tooltip>
          <span className="text-label text-text-secondary uppercase">
            {t('continue')}
          </span>
        </div>
      )}
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              icon={<IconSkip className="h-6 w-6" />}
              label={t('skip')}
              size="lg"
              onClick={onSkip}
              disabled={disabled}
            />
          </TooltipTrigger>
          <TooltipContent>{t('skipTooltip')}</TooltipContent>
        </Tooltip>
        <span className="text-label text-text-secondary uppercase">
          {t('skip')}
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              icon={<IconArchive className="h-6 w-6" />}
              label={t('archive')}
              size="lg"
              onClick={onArchive}
              disabled={disabled}
            />
          </TooltipTrigger>
          <TooltipContent>{t('archiveTooltip')}</TooltipContent>
        </Tooltip>
        <span className="text-label text-text-secondary uppercase">
          {t('archive')}
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              icon={<IconReply className="h-6 w-6" />}
              label={t('reply')}
              size="lg"
              onClick={onReply}
              disabled={disabled}
            />
          </TooltipTrigger>
          <TooltipContent>{t('replyTooltip')}</TooltipContent>
        </Tooltip>
        <span className="text-label text-text-secondary uppercase">
          {t('reply')}
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              icon={<IconFolder className="h-6 w-6" />}
              label={t('moveToFolder')}
              size="lg"
              onClick={onMove}
              disabled={disabled}
            />
          </TooltipTrigger>
          <TooltipContent>{t('moveToFolderTooltip')}</TooltipContent>
        </Tooltip>
        <span className="text-label text-text-secondary uppercase">
          {t('moveTo')}
        </span>
      </div>
    </div>
  )
}
