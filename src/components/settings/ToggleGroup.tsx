import {
  ToggleGroup as UiToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'

interface Option<T extends string> {
  value: T
  label: string
}

interface ToggleGroupProps<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  'aria-label': string
}

export function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
  disabled,
  'aria-label': label,
}: ToggleGroupProps<T>) {
  return (
    <UiToggleGroup
      aria-label={label}
      disabled={disabled}
      deselectable={false}
      value={[value]}
      onValueChange={([next]) => {
        if (next !== undefined) onChange(next)
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </UiToggleGroup>
  )
}
