'use client'

import { Home, Inbox, Headphones, Settings } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/listen', label: 'Listen', icon: Headphones },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

export default function ScratchSidebarPreview() {
  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <span>M</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {NAV_ITEMS.map(({ href, label, icon: Icon }, i) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton isActive={i === 0} tooltip={label}>
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}
