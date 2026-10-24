"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { AlertCircle, Eye, EyeOff, MessageCircle, Search, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const TRUST_POINTS = [
  { icon: ShieldCheck, title: "Public vouches", text: "Every completed trade leaves a vouch on the seller's profile." },
  { icon: Search, title: "Hall of Shame", text: "Check a username or GCash number before you pay." },
  { icon: MessageCircle, title: "Deal in chat", text: "Agree on price, payment and delivery before anything moves." },
]

/**
 * Shared frame for every authentication screen: a brand panel on large screens and a
 * focused form column. The site header is hidden on /auth, so the wordmark links home.
 */
export function AuthShell({
  title,
  subtitle,
  icon,
  topLink,
  children,
  footer,
}: {
  title: string
  subtitle?: React.ReactNode
  /** Optional status icon shown above the title (e.g. a check on success screens). */
  icon?: React.ReactNode
  /** Small link in the top-right corner, e.g. "New here? Create an account". */
  topLink?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(480px,600px)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-white/[0.06] bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_25%_30%,rgba(41,151,255,0.16),transparent_70%)]"
        />
        <Link href="/" className="relative text-[19px] font-semibold tracking-[-0.02em]">
          RbMarket
        </Link>
        <div className="relative max-w-xl">
          <h2 className="text-sheen text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] xl:text-[56px]">
            Trade Roblox items.
            <br />
            Safely.
          </h2>
          <ul className="mt-10 max-w-md space-y-6">
            {TRUST_POINTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
                  <Icon className="size-5 text-link" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">{t}</span>
                  <span className="block text-[15px] text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-muted-foreground">Not affiliated with Roblox Corporation.</p>
      </aside>

      {/* Form column */}
      <section className="flex min-h-screen flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between gap-4 text-[15px]">
          <Link href="/" className="text-[19px] font-semibold tracking-[-0.02em] lg:invisible">
            RbMarket
          </Link>
          {topLink && <div className="text-muted-foreground">{topLink}</div>}
        </div>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          {icon && <div className="mb-6">{icon}</div>}
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.025em]">{title}</h1>
          {subtitle && <p className="mt-2 text-[17px] leading-snug text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-[15px] text-muted-foreground">{footer}</div>}
        </div>

        <p className="text-center text-xs text-muted-foreground lg:hidden">Not affiliated with Roblox Corporation.</p>
      </section>
    </main>
  )
}

/** Circle icon used on status screens (check, envelope, lock). */
export function AuthStatusIcon({ tone = "link", children }: { tone?: "link" | "success" | "destructive"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "grid size-14 place-items-center rounded-2xl",
        tone === "success" && "bg-success/15 text-success",
        tone === "destructive" && "bg-destructive/15 text-destructive",
        tone === "link" && "bg-link/15 text-link",
      )}
    >
      {children}
    </span>
  )
}

export function AuthError({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <div role="alert" className="mb-5 flex gap-2.5 rounded-xl bg-destructive/10 px-4 py-3 text-[15px] text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </div>
  )
}

export function AuthField({
  id,
  label,
  hint,
  aside,
  children,
}: {
  id: string
  label: string
  hint?: React.ReactNode
  /** Right-aligned element on the label row, e.g. a "Forgot password?" link. */
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-muted-foreground">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Large text input used across auth forms. */
export function AuthInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input className={cn("h-12 rounded-xl px-4 text-[17px] md:text-[17px]", className)} {...props} />
}

export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <AuthInput type={visible ? "text" : "password"} className={cn("pr-12", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
      >
        {visible ? <EyeOff className="size-[18px]" strokeWidth={1.75} /> : <Eye className="size-[18px]" strokeWidth={1.75} />}
      </button>
    </div>
  )
}
