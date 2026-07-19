'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Headphones, Home, Inbox, Settings } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { signOutAction } from '@/lib/auth/actions'

const NAV_ITEMS = [
  { href: '/home', key: 'home', icon: Home },
  { href: '/listen', key: 'listen', icon: Headphones },
  { href: '/inbox', key: 'inbox', icon: Inbox },
  { href: '/settings', key: 'settings', icon: Settings },
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')

  const user = session?.user
  const displayName = user?.name || user?.email || tCommon('user')
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/home"
          className="text-h2 text-text-primary flex items-center px-2 py-1 font-bold"
        >
          <span className="hidden group-data-[collapsible=icon]:inline">
            {tCommon('brand').slice(0, 1)}
          </span>
          <span className="group-data-[collapsible=icon]:hidden">
            {tCommon('brand')}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === href}
                tooltip={t(key)}
              >
                <Link href={href}>
                  <Icon />
                  <span>{t(key)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user?.image || ''}
                      alt={displayName}
                      className="rounded-lg"
                    />
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">
                      {displayName}
                    </span>
                    <span className="text-sidebar-foreground/70 truncate text-xs">
                      {user?.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/settings">{t('settings')}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={signOutAction} className="w-full">
                    <button type="submit" className="w-full text-left">
                      {t('signOut')}
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
