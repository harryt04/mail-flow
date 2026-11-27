import * as React from 'react'
import { mergeProps } from '@ui-sdk/react/primitive'
import { cn } from '@/lib/utils'

type SlotProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement>
  prepend?: React.ReactNode
}

function Slot({ children, prepend, ...props }: SlotProps) {
  const child = React.Children.only(children) as React.ReactElement<
    React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
  >
  const merged = mergeProps(props, child.props)
  return React.cloneElement(child, {
    ...merged,
    className: cn(props.className, child.props.className),
    children:
      prepend == null ? (
        child.props.children
      ) : (
        <>
          {prepend}
          {child.props.children}
        </>
      ),
  })
}

export { Slot }
