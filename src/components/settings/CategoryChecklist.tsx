import { Button } from '@/components/ui/Button'

interface Option<T extends string> {
  value: T
  label: string
}

interface CategoryChecklistProps<T extends string> {
  values: T[]
  options: Option<T>[]
  onChange: (values: T[]) => void
  disabled?: boolean
}

/** Multi-select checklist (unlike ToggleGroup, options aren't mutually exclusive) — used for picking which categories to silently auto-skip while listening. */
export function CategoryChecklist<T extends string>({
  values,
  options,
  onChange,
  disabled,
}: CategoryChecklistProps<T>) {
  function toggle(value: T) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value))
    } else {
      onChange([...values, value])
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-wrap" role="group">
      {options.map((option) => {
        const selected = values.includes(option.value)
        return (
          <Button
            key={option.value}
            type="button"
            variant={selected ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={selected}
            onClick={() => toggle(option.value)}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
