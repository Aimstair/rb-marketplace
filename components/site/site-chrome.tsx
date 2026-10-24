"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { SiteHeader } from "@/components/site/site-header"

// Routes that render their own full-screen layout
const NO_HEADER = ["/admin", "/maintenance", "/auth"]
const NO_FOOTER = [...NO_HEADER, "/messages"]

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))

export function SiteChrome({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname() || "/"

  return (
    <>
      {!matches(pathname, NO_HEADER) && <SiteHeader />}
      {children}
      {!matches(pathname, NO_FOOTER) && footer}
    </>
  )
}
