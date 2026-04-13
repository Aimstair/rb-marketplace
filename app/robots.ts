import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://rbmarket.app").replace(/\/$/, "")

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/sell",
          "/opengraph-image",
          "/*/opengraph-image",
          "/*.json$",
          "/*?*sort=",
          "/*?*filter=",
          "/*?*page=",
          "/*?*view=",
          "/messages",
          "/my-listings",
          "/my-transactions",
          "/settings",
          "/notifications",
        ],
      },
      // Specific rules for common bots
      {
        userAgent: "Googlebot",
        allow: "/",
        crawlDelay: 0,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        crawlDelay: 1,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
