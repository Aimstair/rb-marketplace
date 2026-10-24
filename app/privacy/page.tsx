import type { Metadata } from "next"
import Link from "next/link"
import { LegalList, LegalPage, SupportEmail, type LegalSection } from "@/components/site/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What information RbMarket collects, why, who we share it with, and the choices you have.",
  alternates: { canonical: "/privacy" },
}

const providers = [
  ["Vercel", "Hosts the website and provides privacy-friendly usage and performance analytics."],
  ["Supabase", "Stores our database (servers in Tokyo, Japan)."],
  ["UploadThing", "Stores images you upload, such as listing photos, avatars and evidence screenshots."],
  ["Pusher", "Delivers chat messages and notifications in real time."],
  ["Resend", "Sends account emails, such as verification codes and password reset links."],
  ["PayMongo and PayPal", "Process payments for subscriptions and boosts."],
]

const sections: LegalSection[] = [
  {
    id: "collect",
    title: "Information we collect",
    body: (
      <>
        <p>
          <strong className="font-semibold text-foreground">Information you give us</strong>
        </p>
        <LegalList>
          <li>Account details: username, email address and password. Passwords are stored only as a secure hash.</li>
          <li>Profile details you choose to add: profile picture, banner, bio, Roblox username and Discord username.</li>
          <li>
            What you post and send: listings and photos, chat messages, vouches, reports, Hall of Shame submissions and
            evidence, comments and support tickets.
          </li>
          <li>Trade records: what was traded, amounts, and the status of each trade.</li>
        </LegalList>
        <p>
          <strong className="font-semibold text-foreground">Information collected automatically</strong>
        </p>
        <LegalList>
          <li>
            Your IP address and browser details, used to count unique listing views, limit abuse (such as spam and
            repeated login attempts) and keep accounts secure.
          </li>
          <li>Activity such as when you were last active, failed login attempts and which listings you viewed.</li>
          <li>Anonymous usage and performance data that helps us see which pages are slow or broken.</li>
        </LegalList>
        <p>
          <strong className="font-semibold text-foreground">Payments</strong>
        </p>
        <p>
          When you buy a plan or boost, PayMongo or PayPal handles your payment details. We receive and store a payment
          reference, the amount and its status. We never see or store your card number or e-wallet login.
        </p>
        <p>
          Payments for trades between users (for example by GCash) happen outside RbMarket, so we don&apos;t receive
          those payment details unless you share them in chat or a report.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <LegalList>
        <li>To run your account and the marketplace: showing listings, delivering messages and recording trades.</li>
        <li>To build trust: displaying vouches and publishing reviewed Hall of Shame reports.</li>
        <li>To keep RbMarket safe: detecting scams, fake vouches, spam and account takeovers, and enforcing our terms.</li>
        <li>To send account emails, such as verification codes, password resets and important notices.</li>
        <li>To send optional updates and the market digest, only if you turn them on in Settings.</li>
        <li>To understand how the site is used so we can fix problems and improve it.</li>
      </LegalList>
    ),
  },
  {
    id: "public",
    title: "What other people can see",
    body: (
      <>
        <p>RbMarket is a public marketplace, so some information is visible to everyone:</p>
        <LegalList>
          <li>Your username, profile picture, banner, bio, join date, listings, vouches and trade count.</li>
          <li>Your email and Roblox profile only if you turn those on under Settings › Privacy.</li>
        </LegalList>
        <p>
          Chat messages are visible to the people in the conversation. Moderators may review messages when investigating
          reports, disputes or suspected scams.
        </p>
        <p>
          Published Hall of Shame reports show the reported usernames, payment details (such as GCash numbers) and
          evidence submitted by the reporter, after moderator review. If you are named in a report and believe it is
          wrong, see <a href="#rights" className="text-link hover:underline">your rights</a> below.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>We don&apos;t sell your personal information. We share it only with service providers that help us run RbMarket:</p>
        <div className="overflow-hidden rounded-[20px] bg-card">
          <dl className="divide-y divide-white/[0.06]">
            {providers.map(([name, purpose]) => (
              <div key={name} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-4">
                <dt className="font-semibold text-foreground">{name}</dt>
                <dd className="text-[15px] text-muted-foreground">{purpose}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p>
          Some of these providers process data outside the Philippines, including in Japan and the United States. We use
          providers that protect personal data with appropriate safeguards.
        </p>
        <p>
          We may also disclose information when the law requires it, to respond to valid legal requests, or to protect
          users from fraud or harm.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <p>
        We use a cookie to keep you logged in, and your browser&apos;s local storage to remember small preferences. Our
        analytics don&apos;t use advertising cookies, and we don&apos;t show third-party ads.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <>
        <p>
          We keep your information while your account is open. Trade records, reports and related messages may be kept
          longer when needed to resolve disputes, prevent fraud, or meet legal obligations.
        </p>
        <p>
          When you delete your account, we remove or anonymize your personal information within a reasonable time,
          except records we need to keep for safety or legal reasons. Vouches you left for others may remain without
          your name.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>
          Under the Philippine Data Privacy Act of 2012, you have the right to be informed about how your data is used,
          and to access, correct, object to the processing of, and request deletion of your personal information. You
          can also ask for a copy of your data.
        </p>
        <LegalList>
          <li>You can edit most profile details yourself in Settings.</li>
          <li>
            For anything else, including deleting your account or disputing a Hall of Shame report, email{" "}
            <SupportEmail /> from the address on your account. We will reply within 15 days.
          </li>
          <li>
            If you think we have mishandled your data, you can complain to the National Privacy Commission of the
            Philippines.
          </li>
        </LegalList>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We protect your information with encrypted connections (HTTPS), hashed passwords, access controls and rate
        limits on sensitive actions. No system is perfectly secure, so use a strong, unique password and never share your
        login. If we learn of a breach that affects you, we will notify you and the authorities as the law requires.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        RbMarket is not meant for children under 13. Users aged 13 to 17 need permission from a parent or guardian, as
        described in our <Link href="/terms" className="text-link hover:underline">Terms of Service</Link>. If you
        believe a child under 13 has an account, email <SupportEmail /> and we will remove it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <>
        <p>
          We will update this policy when our practices change and change the date at the top. If a change is
          significant, we will tell you on the site or by email.
        </p>
        <p>
          Questions or requests about your privacy? Email <SupportEmail />.
        </p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 24, 2026"
      intro={
        <p>
          This explains what information RbMarket collects, why we need it, who we share it with, and what you can do
          about it. We don&apos;t sell your data or show third-party ads.
        </p>
      }
      sections={sections}
      related={{ href: "/terms", label: "Terms of Service" }}
    />
  )
}
