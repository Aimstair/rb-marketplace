import type { Metadata } from "next"
import Link from "next/link"
import { Container, Section } from "@/components/site/container"
import { FaqSection } from "@/components/seo/faq-section"
import { WebPageJsonLd } from "@/components/json-ld"
import { GENERAL_FAQ } from "@/lib/seo-content"
import { SITE_DEFINITION, SUPPORT_EMAIL } from "@/lib/seo"

const title = "How RbMarket Works: Buying, Selling & Safety FAQ"
const description =
  "How to buy and sell Roblox items on RbMarket: payments with GCash and PayPal, fees, vouches, the Hall of Shame and how to avoid scams."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faq" },
  openGraph: { title, description, url: "/faq", type: "article" },
  twitter: { card: "summary_large_image", title, description },
}

const STEPS = [
  {
    title: "List or find an item",
    body: "Sellers list Roblox items, pets and in-game currency with a price in pesos. Buyers browse by game or search the marketplace.",
  },
  {
    title: "Agree in chat",
    body: "The buyer messages the seller on RbMarket. Both agree on the price, the payment method and how the item will be delivered in-game.",
  },
  {
    title: "Pay the seller directly",
    body: "The buyer pays the seller with GCash, PayPal or bank transfer. RbMarket never holds the money and takes no cut of the trade.",
  },
  {
    title: "Deliver and vouch",
    body: "The seller delivers the item in Roblox. Both sides confirm the trade and leave a vouch, building each other's reputation.",
  },
]

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-background">
      <WebPageJsonLd type="AboutPage" name={title} description={description} path="/faq" crumbs={[{ name: "FAQ", path: "/faq" }]} />

      <Section className="pb-6 md:pb-8">
        <Container className="max-w-[860px]">
          <h1 className="text-title">How RbMarket works</h1>
          <p className="mt-4 text-[19px] leading-relaxed text-muted-foreground">{SITE_DEFINITION}</p>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container className="max-w-[860px]">
          <h2 className="text-section mb-6">A trade in four steps</h2>
          <ol className="grid gap-3 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-[20px] bg-card p-5 md:p-6">
                <span className="text-[13px] font-semibold text-link">Step {i + 1}</span>
                <h3 className="mt-1 text-[17px] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section surface>
        <Container>
          <FaqSection entries={GENERAL_FAQ} />
          <p className="mx-auto mt-8 max-w-[860px] text-[15px] text-muted-foreground">
            Still stuck? Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-link hover:underline">
              {SUPPORT_EMAIL}
            </a>
            , read the <Link href="/terms" className="text-link hover:underline">Terms of Service</Link>, or browse the{" "}
            <Link href="/games" className="text-link hover:underline">games on RbMarket</Link>.
          </p>
        </Container>
      </Section>
    </main>
  )
}
