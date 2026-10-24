import { SITE_DEFINITION, SITE_NAME, SUPPORT_EMAIL, absoluteUrl, gamePath, getSiteUrl } from "@/lib/seo"
import type { FaqEntry } from "@/lib/seo-content"

type JsonObject = Record<string, unknown>

/** Renders schema.org data. `<` is escaped so user-written text can't close the script tag. */
export function JsonLdScript({ data }: { data: JsonObject | JsonObject[] }) {
  const json = JSON.stringify(Array.isArray(data) ? { "@context": "https://schema.org", "@graph": data } : data)
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json.replace(/</g, "\\u003c") }} />
}

const organizationId = () => `${getSiteUrl()}/#organization`
const websiteId = () => `${getSiteUrl()}/#website`

/**
 * The site-wide entity graph, rendered once in the root layout: who runs the site, what it is,
 * and how to search it. Pages refer back to these by @id instead of repeating them.
 */
export function SiteJsonLd({ sameAs = [] }: { sameAs?: string[] }) {
  const siteUrl = getSiteUrl()
  const organization: JsonObject = {
    "@type": "Organization",
    "@id": organizationId(),
    name: SITE_NAME,
    alternateName: ["RbMarket.app", "RB Market", "Roblox Market PH"],
    url: siteUrl,
    logo: { "@type": "ImageObject", url: absoluteUrl("/logo-512.png"), width: 512, height: 512 },
    description: SITE_DEFINITION,
    email: SUPPORT_EMAIL,
    areaServed: { "@type": "Country", name: "Philippines" },
    knowsAbout: ["Roblox", "Roblox item trading", "Roblox limiteds", "Grow a Garden", "Steal a Brainrot", "Murder Mystery 2", "Blox Fruits", "Adopt Me"],
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: SUPPORT_EMAIL, availableLanguage: ["English", "Filipino"] },
  }
  if (sameAs.length > 0) organization.sameAs = sameAs

  const website: JsonObject = {
    "@type": "WebSite",
    "@id": websiteId(),
    name: SITE_NAME,
    alternateName: "RbMarket Roblox Marketplace",
    url: siteUrl,
    description: SITE_DEFINITION,
    inLanguage: "en-PH",
    publisher: { "@id": organizationId() },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/marketplace?search={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  }

  return <JsonLdScript data={[organization, website]} />
}

interface Crumb {
  name: string
  path: string
}

function breadcrumbList(crumbs: Crumb[]): JsonObject {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

/** Breadcrumb trail, Home first. */
export function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  return <JsonLdScript data={{ "@context": "https://schema.org", ...breadcrumbList([{ name: "Home", path: "/" }, ...crumbs]) }} />
}

/** FAQPage data. Only use with questions that are also visible on the page. */
export function FaqJsonLd({ entries }: { entries: FaqEntry[] }) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: entries.map((entry) => ({
          "@type": "Question",
          name: entry.question,
          acceptedAnswer: { "@type": "Answer", text: entry.answer },
        })),
      }}
    />
  )
}

interface WebPageJsonLdProps {
  name: string
  description: string
  path: string
  type?: "WebPage" | "CollectionPage" | "AboutPage" | "FAQPage"
  crumbs?: Crumb[]
}

/** A page node tied to the site graph, with an optional breadcrumb trail. */
export function WebPageJsonLd({ name, description, path, type = "WebPage", crumbs }: WebPageJsonLdProps) {
  const url = absoluteUrl(path)
  const nodes: JsonObject[] = [
    {
      "@type": type,
      "@id": `${url}#webpage`,
      name,
      description,
      url,
      inLanguage: "en-PH",
      isPartOf: { "@id": websiteId() },
      publisher: { "@id": organizationId() },
    },
  ]
  if (crumbs?.length) nodes.push(breadcrumbList([{ name: "Home", path: "/" }, ...crumbs]))
  return <JsonLdScript data={nodes} />
}

export function CollectionPageJsonLd(props: Omit<WebPageJsonLdProps, "type">) {
  return <WebPageJsonLd {...props} type="CollectionPage" />
}

interface ListedItem {
  name: string
  path: string
  image?: string | null
}

/** An ordered list of listings, so search engines can read a category page's contents. */
export function ItemListJsonLd({ name, path, items }: { name: string; path: string; items: ListedItem[] }) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        url: absoluteUrl(path),
        numberOfItems: items.length,
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: absoluteUrl(item.path),
          name: item.name,
          ...(item.image ? { image: absoluteUrl(item.image) } : {}),
        })),
      }}
    />
  )
}

interface ProfileJsonLdProps {
  name: string
  profilePath: string
  description?: string
  image?: string | null
  sameAs?: string[]
  createdAt?: string | Date | null
  vouchCount?: number
}

/** A trader's profile page, using Google's ProfilePage type. */
export function ProfileJsonLd({ name, profilePath, description, image, sameAs = [], createdAt, vouchCount }: ProfileJsonLdProps) {
  const url = absoluteUrl(profilePath)
  const person: JsonObject = {
    "@type": "Person",
    name,
    alternateName: name,
    url,
    ...(description ? { description } : {}),
    ...(image ? { image: absoluteUrl(image) } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }
  if (typeof vouchCount === "number" && vouchCount > 0) {
    person.interactionStatistic = {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: vouchCount,
      name: "Vouches",
    }
  }
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url,
        ...(createdAt ? { dateCreated: new Date(createdAt).toISOString() } : {}),
        mainEntity: person,
        isPartOf: { "@id": websiteId() },
      }}
    />
  )
}

interface PersonJsonLdProps {
  name: string
  profilePath: string
  description?: string
  alternateName?: string[]
  sameAs?: string[]
}

/** A person record without ratings, used for Hall of Shame reports. */
export function PersonJsonLd({ name, profilePath, description, alternateName = [], sameAs = [] }: PersonJsonLdProps) {
  const url = absoluteUrl(profilePath)
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "Person",
        name,
        url,
        mainEntityOfPage: url,
        ...(description ? { description } : {}),
        ...(alternateName.length > 0 ? { alternateName: alternateName.filter(Boolean) } : {}),
        ...(sameAs.length > 0 ? { sameAs: sameAs.filter(Boolean) } : {}),
      }}
    />
  )
}

interface ArticleJsonLdProps {
  title: string
  description: string
  path: string
  image?: string | null
  authorName: string
  publishedAt: string | Date
  updatedAt?: string | Date
}

export function ArticleJsonLd({ title, description, path, image, authorName, publishedAt, updatedAt }: ArticleJsonLdProps) {
  const url = absoluteUrl(path)
  return (
    <JsonLdScript
      data={[
        {
          "@type": "BlogPosting",
          headline: title,
          description,
          url,
          mainEntityOfPage: url,
          ...(image ? { image: absoluteUrl(image) } : {}),
          author: { "@type": "Person", name: authorName },
          publisher: { "@id": organizationId() },
          datePublished: new Date(publishedAt).toISOString(),
          dateModified: new Date(updatedAt || publishedAt).toISOString(),
          inLanguage: "en-PH",
        },
        breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/blog" },
          { name: title, path },
        ]),
      ]}
    />
  )
}

interface SeoListing {
  id: string
  title: string
  image?: string | null
  description?: string | null
  price?: number | null
  ratePerPeso?: number | null
  currencyName?: string | null
  stock?: number | null
  listingType?: string | null
  gameName?: string | null
  condition?: string | null
  sellerName?: string | null
  sellerUrl?: string | null
}

const CONDITIONS: Record<string, string> = {
  new: "https://schema.org/NewCondition",
  mint: "https://schema.org/NewCondition",
  used: "https://schema.org/UsedCondition",
}

/**
 * Product + Offer + breadcrumb for a listing. Seller vouches are not product reviews, so no
 * rating is attached here: marking them up as one would misrepresent the item.
 */
export function JsonLd({ listing, urlPath }: { listing: SeoListing; urlPath?: string }) {
  const isCurrency = listing.listingType?.toUpperCase() === "CURRENCY"
  const path = urlPath || (isCurrency ? `/currency/${listing.id}` : `/listing/${listing.id}`)
  const url = absoluteUrl(path)
  const stock = Number(listing.stock ?? 0)
  const rate = Number(listing.ratePerPeso ?? 0)

  const offer: JsonObject = {
    "@type": "Offer",
    url,
    priceCurrency: "PHP",
    price: isCurrency ? 1 : Number(listing.price ?? 0),
    availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    ...(listing.sellerName
      ? { seller: { "@type": "Person", name: listing.sellerName, ...(listing.sellerUrl ? { url: absoluteUrl(listing.sellerUrl) } : {}) } }
      : {}),
  }
  if (isCurrency && rate > 0) {
    // Currency is priced as "this many units per ₱1"
    offer.priceSpecification = {
      "@type": "UnitPriceSpecification",
      price: 1,
      priceCurrency: "PHP",
      referenceQuantity: { "@type": "QuantitativeValue", value: rate, unitText: listing.currencyName || "units" },
    }
  }
  const condition = CONDITIONS[(listing.condition || "").toLowerCase()]
  if (condition) offer.itemCondition = condition

  const product: JsonObject = {
    "@type": "Product",
    "@id": `${url}#product`,
    name: listing.title,
    url,
    ...(listing.image ? { image: absoluteUrl(listing.image) } : {}),
    description: listing.description?.trim() || `${listing.title}${listing.gameName ? ` for ${listing.gameName}` : ""}, sold on ${SITE_NAME}.`,
    ...(listing.gameName ? { category: `Roblox > ${listing.gameName}` } : {}),
    offers: offer,
  }

  const crumbs: Crumb[] = [{ name: "Home", path: "/" }]
  if (isCurrency) crumbs.push({ name: "Currency", path: "/currency" })
  else if (listing.gameName) crumbs.push({ name: listing.gameName, path: gamePath(listing.gameName) })
  else crumbs.push({ name: "Marketplace", path: "/marketplace" })
  crumbs.push({ name: listing.title, path })

  return <JsonLdScript data={[product, breadcrumbList(crumbs)]} />
}
