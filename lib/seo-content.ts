/**
 * Plain-language answers to the questions people ask search engines and AI assistants about
 * RbMarket. Each answer leads with the direct answer in its first sentence so it can be quoted
 * on its own. The same entries render on the page and in FAQPage structured data, which must
 * match what users can see.
 */

export interface FaqEntry {
  question: string
  answer: string
}

export const GENERAL_FAQ: FaqEntry[] = [
  {
    question: "What is RbMarket?",
    answer:
      "RbMarket is a peer-to-peer Roblox marketplace for the Philippines. Players list Roblox items, pets, limiteds and in-game currency with prices in pesos, and buyers message sellers directly to trade. Listing is free.",
  },
  {
    question: "How do I buy Roblox items on RbMarket?",
    answer:
      "Find the item on the marketplace, check the seller's vouches, then tap Message seller to agree on price, payment and delivery in chat. Pay the seller directly, usually with GCash or PayPal, and receive the item in-game. After the trade, leave a vouch so other buyers know the seller delivered.",
  },
  {
    question: "How do I sell Roblox items for cash in the Philippines?",
    answer:
      "Create a free RbMarket account, tap Sell, pick the game and item, set your price in pesos and publish. Buyers message you directly, you agree on payment (GCash, PayPal or bank transfer) and deliver the item in-game. Every completed trade earns you a vouch, which helps you sell faster.",
  },
  {
    question: "Is RbMarket safe?",
    answer:
      "RbMarket reduces risk but cannot remove it, because payments go directly between buyers and sellers. Trade with sellers who have many vouches, search the Hall of Shame for the seller's name, GCash number or Roblox username before paying, and keep all chat inside RbMarket so there is a record if something goes wrong.",
  },
  {
    question: "What payment methods can I use?",
    answer:
      "Most trades on RbMarket are paid with GCash or PayPal, and some sellers accept bank transfer. Payment goes straight from the buyer to the seller; RbMarket never holds trade money. All prices are listed in Philippine pesos (₱).",
  },
  {
    question: "Does RbMarket charge fees?",
    answer:
      "No. Creating an account, listing items and messaging are free, and RbMarket takes no cut of trades. Optional paid plans and listing boosts give your listings more visibility.",
  },
  {
    question: "What is the Hall of Shame?",
    answer:
      "The Hall of Shame is RbMarket's public list of reported scammers. Each entry is reviewed by moderators and lists the scammer's aliases, Roblox usernames and payment identifiers such as GCash numbers, so you can check a trader before you pay.",
  },
  {
    question: "What are vouches?",
    answer:
      "A vouch is a review a trader receives after a completed trade on RbMarket. Sellers with more vouches have a longer record of delivering, so check the vouch count on every listing and profile before you buy.",
  },
  {
    question: "Which Roblox games can I trade on RbMarket?",
    answer:
      "RbMarket supports popular trading games including Grow a Garden, Steal a Brainrot, Murder Mystery 2 (MM2), Blox Fruits, Adopt Me, Pet Simulator 99, Anime Vanguards, Fisch and more, plus Roblox limiteds and UGC items. Each game has its own page with live listings.",
  },
  {
    question: "Can I buy in-game currency like Sheckles, Gems or Robux?",
    answer:
      "Yes. The Currency section lists sellers offering in-game currencies, each showing a rate per ₱1, stock and minimum and maximum order. Compare rates across sellers, then message the seller to buy.",
  },
  {
    question: "Is RbMarket affiliated with Roblox?",
    answer:
      "No. RbMarket is an independent marketplace and is not affiliated with, endorsed by or sponsored by Roblox Corporation or any game developer. Roblox and game rules on trading still apply to your account.",
  },
]

/** The short set shown on the home page. */
export const HOME_FAQ: FaqEntry[] = [
  GENERAL_FAQ[0],
  GENERAL_FAQ[1],
  GENERAL_FAQ[2],
  GENERAL_FAQ[3],
  GENERAL_FAQ[4],
  GENERAL_FAQ[5],
]

/** Questions for a single game page, answered with that game's names and currencies. */
export function gameFaq(game: { displayName: string; currencies: string[] }): FaqEntry[] {
  const name = game.displayName
  const entries: FaqEntry[] = [
    {
      question: `Where can I buy ${name} items in the Philippines?`,
      answer: `You can buy ${name} items on RbMarket, a Philippine Roblox marketplace with prices in pesos. Browse the live ${name} listings on this page, check each seller's vouches, then message the seller to agree on payment by GCash or PayPal.`,
    },
    {
      question: `How do I sell ${name} items for cash?`,
      answer: `Sign up for free on RbMarket, tap Sell, choose ${name} and the item you have, set a price in pesos and publish. Buyers message you directly and pay you by GCash, PayPal or bank transfer before you deliver in-game.`,
    },
    {
      question: `How do I avoid scams when trading ${name} items?`,
      answer: `Trade with sellers who have vouches, look up their name, Roblox username and GCash number in the RbMarket Hall of Shame before paying, and keep the whole conversation in RbMarket chat. Never trade with someone who asks you to move to another app first.`,
    },
  ]

  if (game.currencies.length > 0) {
    const list = game.currencies.join(", ")
    entries.push({
      question: `Can I buy ${name} ${game.currencies[0]} on RbMarket?`,
      answer: `Yes. Sellers on RbMarket offer ${name} currency (${list}) at a rate per ₱1. Open the Currency section, filter by ${name}, compare rates and stock, and message the seller with the best offer.`,
    })
  }

  return entries
}
