import type React from "react"
import Link from "next/link"
import { Container } from "@/components/site/container"

export interface LegalSection {
  id: string
  title: string
  body: React.ReactNode
}

/** Layout for long-form legal pages: title, date, sticky contents list and readable sections. */
export function LegalPage({
  title,
  intro,
  updated,
  sections,
  related,
}: {
  title: string
  intro: React.ReactNode
  updated: string
  sections: LegalSection[]
  related: { href: string; label: string }
}) {
  return (
    <main className="min-h-screen bg-background">
      <Container className="pt-10 pb-16 md:pt-14 md:pb-24">
        <header className="max-w-3xl">
          <p className="text-[13px] text-muted-foreground">Last updated {updated}</p>
          <h1 className="text-title mt-2">{title}</h1>
          <div className="mt-4 text-[17px] leading-relaxed text-muted-foreground">{intro}</div>
        </header>

        <div className="mt-12 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-[76px]">
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
              <ol className="space-y-2 text-[15px]">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-muted-foreground transition-colors hover:text-foreground">
                      {i + 1}. {s.title}
                    </a>
                  </li>
                ))}
              </ol>
              <p className="mt-8 text-[15px]">
                <Link href={related.href} className="text-link hover:underline underline-offset-2">
                  {related.label} ›
                </Link>
              </p>
            </div>
          </nav>

          <article className="max-w-3xl space-y-12">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
                  {i + 1}. {s.title}
                </h2>
                <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-foreground/85">{s.body}</div>
              </section>
            ))}
          </article>
        </div>
      </Container>
    </main>
  )
}

/** Bulleted list styled for legal copy. */
export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground">{children}</ul>
}

export function SupportEmail() {
  return (
    <a href="mailto:support@rbmarket.app" className="text-link hover:underline underline-offset-2">
      support@rbmarket.app
    </a>
  )
}
