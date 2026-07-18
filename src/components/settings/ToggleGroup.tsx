import { Button } from '@/components/ui/Button'

interface Option<T extends string> {
  value: T
  label: string
}

interface ToggleGroupProps<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}

export function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: ToggleGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? 'primary' : 'secondary'}
          size="md"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
