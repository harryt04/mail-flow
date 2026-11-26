'use client'

import * as React from 'react'
import {
  CheckIcon,
  ChevronRightIcon,
  CircleIcon,
  MinusIcon,
} from 'lucide-react'
import * as Sdk from '@ui-sdk/react/menu'
import { renderElement } from '@ui-sdk/react/primitive'

import { cn } from '@/lib/utils'

const GroupContext = React.createContext(false)
const PortalContext = React.createContext<{
  container?: React.ComponentProps<typeof Sdk.MenuContent>['container']
  keepMounted?: boolean
}>({})

function DropdownMenu({
  loop = false,
  ...props
}: React.ComponentProps<typeof Sdk.Menu>) {
  return <Sdk.Menu loop={loop} {...props} />
}

function DropdownMenuPortal({
  children,
  container,
  forceMount,
}: Pick<React.ComponentProps<typeof Sdk.MenuContent>, 'container'> & {
  children?: React.ReactNode
  forceMount?: true
}) {
  return (
    <PortalContext.Provider value={{ container, keepMounted: forceMount }}>
      {children}
    </PortalContext.Provider>
  )
}

function DropdownMenuTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof Sdk.MenuTrigger> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return (
      <Sdk.MenuTrigger
        data-ui="dropdown-menu-trigger"
        render={children}
        {...props}
      />
    )
  }
  return (
    <Sdk.MenuTrigger data-ui="dropdown-menu-trigger" {...props}>
      {children}
    </Sdk.MenuTrigger>
  )
}

function DropdownMenuContent({
  className,
  children,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof Sdk.MenuContent>) {
  const portal = React.useContext(PortalContext)
  return (
    <GroupContext.Provider value={false}>
      <Sdk.MenuContent
        data-ui="dropdown-menu-content"
        container={
          portal.container ??
          (typeof document === 'undefined' ? undefined : document.body)
        }
        keepMounted={portal.keepMounted}
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-ending-style:animate-out data-ending-style:fade-out-0 data-ending-style:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 z-50 max-h-(--available-height) min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md',
          className,
        )}
        {...props}
      >
        {children}
      </Sdk.MenuContent>
    </GroupContext.Provider>
  )
}

function DropdownMenuGroup(props: React.ComponentProps<typeof Sdk.MenuGroup>) {
  return (
    <GroupContext.Provider value>
      <Sdk.MenuGroup data-ui="dropdown-menu-group" {...props} />
    </GroupContext.Provider>
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  asChild,
  children,
  render,
  ...props
}: React.ComponentProps<typeof Sdk.MenuItem> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
  asChild?: boolean
}) {
  const child = asChild && React.isValidElement(children) ? children : undefined
  return (
    <Sdk.MenuItem
      render={child ?? render}
      data-ui="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive dark:data-[variant=destructive]:data-highlighted:bg-destructive/20 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive! relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {child ? undefined : children}
    </Sdk.MenuItem>
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  value,
  render,
  ...props
}: Omit<
  React.ComponentProps<typeof Sdk.MenuCheckboxItem>,
  'checked' | 'value' | 'children'
> & {
  children?: React.ReactNode
  checked?: boolean | 'indeterminate'
  value?: string
}) {
  const id = React.useId()
  const mixed = checked === 'indeterminate'
  const Indicator = mixed ? MinusIcon : CheckIcon
  return (
    <Sdk.MenuCheckboxItem
      data-ui="dropdown-menu-checkbox-item"
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      value={value ?? id}
      checked={mixed ? false : checked}
      render={
        mixed
          ? (partProps, state) => {
              return renderElement(
                'div',
                { ...partProps, 'aria-checked': 'mixed' },
                render,
                state,
              )
            }
          : render
      }
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <Sdk.MenuItemIndicator keepMounted={mixed}>
          <Indicator aria-hidden="true" className="size-4" />
        </Sdk.MenuItemIndicator>
      </span>
      {children}
    </Sdk.MenuCheckboxItem>
  )
}

function DropdownMenuRadioGroup<T extends string>(
  props: React.ComponentProps<typeof Sdk.MenuRadioGroup<T>>,
) {
  return (
    <GroupContext.Provider value>
      <Sdk.MenuRadioGroup data-ui="dropdown-menu-radio-group" {...props} />
    </GroupContext.Provider>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Sdk.MenuRadioItem>, 'children'> & {
  children?: React.ReactNode
}) {
  return (
    <Sdk.MenuRadioItem
      data-ui="dropdown-menu-radio-item"
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <Sdk.MenuItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </Sdk.MenuItemIndicator>
      </span>
      {children}
    </Sdk.MenuRadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<'div'> & {
  inset?: boolean
}) {
  const Label = React.useContext(GroupContext) ? Sdk.MenuGroupLabel : 'div'
  return (
    <Label
      data-ui="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Sdk.MenuSeparator>) {
  return (
    <Sdk.MenuSeparator
      data-ui="dropdown-menu-separator"
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-ui="dropdown-menu-shortcut"
      className={cn(
        'text-muted-foreground ml-auto text-xs tracking-widest',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  loop = false,
  ...props
}: React.ComponentProps<typeof Sdk.MenuSub>) {
  return <Sdk.MenuSub loop={loop} {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Sdk.MenuSubTrigger>, 'children'> & {
  children?: React.ReactNode
  inset?: boolean
}) {
  return (
    <Sdk.MenuSubTrigger
      data-ui="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </Sdk.MenuSubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof Sdk.MenuSubContent>) {
  return (
    <Sdk.MenuSubContent
      data-ui="dropdown-menu-sub-content"
      className={cn(
        'bg-popover text-popover-foreground data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-ending-style:animate-out data-ending-style:fade-out-0 data-ending-style:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 z-50 min-w-[8rem] origin-(--transform-origin) overflow-hidden rounded-md border p-1 shadow-lg',
        className,
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
