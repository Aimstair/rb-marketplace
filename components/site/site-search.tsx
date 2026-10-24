"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Coins, LineChart, Search, ShieldAlert, Store } from "lucide-react"
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

const SHORTCUTS = [
  { href: "/marketplace", label: "Browse items", icon: Store },
  { href: "/currency", label: "Buy in-game currency", icon: Coins },
  { href: "/trends", label: "Price trends", icon: LineChart },
  { href: "/hall-of-shame", label: "Check a trader in the Hall of Shame", icon: ShieldAlert },
]

export function SiteSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const go = (href: string) => {
    onOpenChange(false)
    setQuery("")
    router.push(href)
  }

  const trimmed = query.trim()

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search RbMarket"
      description="Search items, pets and fruits"
      className="top-[18%] translate-y-0 sm:max-w-xl"
      showCloseButton={false}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search Harvester, Shadow Dragon, Kitsune…"
      />
      <CommandList>
        {trimmed && (
          <CommandGroup heading="Items">
            <CommandItem
              value={`search-${trimmed}`}
              onSelect={() => go(`/marketplace?search=${encodeURIComponent(trimmed)}`)}
            >
              <Search strokeWidth={1.5} />
              Search items for “{trimmed}”
              <ArrowRight className="ml-auto text-muted-foreground" strokeWidth={1.5} />
            </CommandItem>
          </CommandGroup>
        )}
        <CommandGroup heading="Go to">
          {SHORTCUTS.map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} value={label} onSelect={() => go(href)}>
              <Icon strokeWidth={1.5} />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
