import type { Metadata } from "next"
import Link from "next/link"
import { LegalList, LegalPage, SupportEmail, type LegalSection } from "@/components/site/legal-page"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using RbMarket, the peer-to-peer marketplace for Roblox items and in-game currency.",
  alternates: { canonical: "/terms" },
}

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these terms",
    body: (
      <>
        <p>
          These terms are an agreement between you and RbMarket (&ldquo;RbMarket&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
          about your use of rbmarket.app and its related services. By creating an account or using the site, you agree to
          these terms and to our <Link href="/privacy" className="text-link hover:underline">Privacy Policy</Link>. If
          you don&apos;t agree, don&apos;t use RbMarket.
        </p>
        <p>
          You must be at least 18 years old, or at least 13 years old with permission from a parent or guardian who agrees
          to these terms on your behalf. Trading involves real money, so parents and guardians are responsible for
          trades made by minors in their care.
        </p>
      </>
    ),
  },
  {
    id: "what-we-are",
    title: "What RbMarket is, and isn't",
    body: (
      <>
        <p>
          RbMarket is a place for people to list Roblox items and in-game currency, find each other, chat, and build a
          reputation through vouches. Trades happen directly between buyers and sellers.
        </p>
        <LegalList>
          <li>We are not a party to any trade. We don&apos;t own, hold or deliver the items or currency being traded.</li>
          <li>
            Payments for trades (for example GCash, PayPal or bank transfer) are sent directly between users, outside
            RbMarket. We don&apos;t hold that money and can&apos;t reverse those payments.
          </li>
          <li>
            We don&apos;t verify every listing or guarantee that a seller will deliver, that a buyer will pay, or that an
            item is as described. Vouches and Hall of Shame reports help, but they are not a guarantee.
          </li>
        </LegalList>
      </>
    ),
  },
  {
    id: "roblox",
    title: "Roblox and the games on RbMarket",
    body: (
      <>
        <p>
          RbMarket is not affiliated with, endorsed by, or sponsored by Roblox Corporation or the developers of any game
          listed on the site. Roblox and game names are trademarks of their owners.
        </p>
        <p>
          Virtual items and currencies are governed by the terms of Roblox and of each game. Those terms may restrict or
          prohibit trading items for real money, and Roblox or a game developer may take action against accounts
          involved in such trades. You are responsible for knowing and following those rules. We aren&apos;t
          responsible for any action Roblox or a developer takes against your account.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <LegalList>
        <li>Give accurate information when you sign up, and keep your email address current.</li>
        <li>Keep your password secret. You are responsible for everything done with your account.</li>
        <li>One account per person. Don&apos;t create accounts to get around a ban, mute or limit.</li>
        <li>
          Tell us right away at <SupportEmail /> if you think someone else has accessed your account.
        </li>
      </LegalList>
    ),
  },
  {
    id: "trading-rules",
    title: "Trading rules",
    body: (
      <>
        <p>When you list, buy or sell on RbMarket, you agree to:</p>
        <LegalList>
          <li>Only list items or currency you actually have and have the right to trade.</li>
          <li>Describe items, prices, stock and delivery honestly, and keep listings up to date.</li>
          <li>Agree on price, payment and delivery in chat before anyone sends anything.</li>
          <li>Deliver what you promised, or pay what you agreed, in a reasonable time.</li>
          <li>Leave vouches only for trades that really happened.</li>
        </LegalList>
        <p>You must not:</p>
        <LegalList>
          <li>Scam, defraud or attempt to defraud anyone, on or off RbMarket.</li>
          <li>Sell stolen, duped, or hacked items or accounts, or items obtained through exploits.</li>
          <li>Create fake vouches, trade with yourself, or coordinate with others to inflate reputation.</li>
          <li>Harass, threaten, impersonate or dox other users, or share their personal information.</li>
          <li>Post spam, malware, phishing links, or illegal, sexual or hateful content.</li>
          <li>Scrape the site, overload it, or try to get around security or rate limits.</li>
        </LegalList>
      </>
    ),
  },
  {
    id: "reports",
    title: "Vouches, reports and the Hall of Shame",
    body: (
      <>
        <p>
          Reports, vouches and Hall of Shame submissions must be truthful and based on real events. When you report
          someone, include honest evidence such as chat screenshots or payment receipts.
        </p>
        <LegalList>
          <li>Moderators review Hall of Shame reports before they are published, and may decline or remove them.</li>
          <li>
            If you believe a published report about you is wrong, email <SupportEmail /> with your explanation and
            evidence. We will review it and correct or remove it if it is inaccurate.
          </li>
          <li>Knowingly false reports or vouches can lead to your account being suspended or banned.</li>
        </LegalList>
      </>
    ),
  },
  {
    id: "paid-features",
    title: "Subscriptions and boosts",
    body: (
      <>
        <p>
          Some features, such as subscription plans and listing boosts, are paid. Prices are shown in Philippine pesos
          before you buy. Payments are processed by our payment partners (PayMongo and PayPal) under their own terms.
        </p>
        <LegalList>
          <li>A plan or boost lasts for the period shown at checkout and ends when that period is over.</li>
          <li>Paid features don&apos;t make a listing or seller more trustworthy, and don&apos;t exempt anyone from these terms.</li>
          <li>
            If something goes wrong with a purchase, contact <SupportEmail />. We review refund requests case by case,
            except where the law gives you a right to a refund.
          </li>
          <li>If your account is banned for breaking these terms, you lose access to any remaining paid time.</li>
        </LegalList>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <p>
        You keep ownership of what you post, such as listings, photos, messages and profile details. You give RbMarket
        permission to store, display and process that content so we can run the service, for example showing your
        listings to buyers or your vouches on your profile. Only post content you have the right to share.
      </p>
    ),
  },
  {
    id: "moderation",
    title: "Moderation, suspension and termination",
    body: (
      <>
        <p>
          To keep the marketplace safe, we may remove listings or content, limit features, mute, suspend or ban
          accounts that break these terms or put other users at risk. Where we reasonably can, we will tell you why.
        </p>
        <p>
          You can stop using RbMarket at any time. To delete your account, email <SupportEmail /> from the address on
          your account.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Disclaimers and limits on liability",
    body: (
      <>
        <p>
          RbMarket is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We work to keep it running and secure, but we
          don&apos;t promise it will always be available, error-free, or that every user is honest.
        </p>
        <p>
          To the extent the law allows, RbMarket is not liable for losses caused by trades between users, by other
          users&apos; actions, by Roblox or game developers, or by events outside our control. Where we are found liable,
          our total liability is limited to the amount you paid us for paid features in the 6 months before the claim.
          Nothing in these terms limits rights you have under Philippine consumer protection law that can&apos;t be
          waived.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes, governing law and contact",
    body: (
      <>
        <p>
          We may update these terms as RbMarket changes. If a change is significant, we will let you know on the site or
          by email before it takes effect. Continuing to use RbMarket after that means you accept the new terms.
        </p>
        <p>These terms are governed by the laws of the Republic of the Philippines.</p>
        <p>
          Questions about these terms? Email <SupportEmail />.
        </p>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 24, 2026"
      intro={
        <p>
          The short version: RbMarket helps you find people to trade Roblox items with. Trades and payments happen
          between you and the other person, so trade carefully, be honest, and follow Roblox&apos;s rules.
        </p>
      }
      sections={sections}
      related={{ href: "/privacy", label: "Privacy Policy" }}
    />
  )
}
