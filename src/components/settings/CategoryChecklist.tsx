import {
  ToggleGroup as UiToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'

interface Option<T extends string> {
  value: T
  label: string
}

interface CategoryChecklistProps<T extends string> {
  values: T[]
  options: Option<T>[]
  onChange: (values: T[]) => void
  disabled?: boolean
  'aria-label': string
}

/** Multi-select checklist (unlike ToggleGroup, options aren't mutually exclusive) — used for picking which categories to silently auto-skip while listening. */
export function CategoryChecklist<T extends string>({
  values,
  options,
  onChange,
  disabled,
  'aria-label': label,
}: CategoryChecklistProps<T>) {
  return (
    <UiToggleGroup
      aria-label={label}
      disabled={disabled}
      multiple
      value={values}
      onValueChange={onChange}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </UiToggleGroup>
  )
}
