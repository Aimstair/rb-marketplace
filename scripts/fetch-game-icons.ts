/**
 * Downloads each game's official icon from Roblox's thumbnail API into public/games/<slug>.webp
 * and points Game.image at it. Universe ids were matched by hand against Roblox search
 * (October 2026). Games without a Roblox listing get a generated tile instead.
 *
 *   pnpm tsx scripts/fetch-game-icons.ts           # dry run
 *   pnpm tsx scripts/fetch-game-icons.ts --apply   # download icons and update the database
 */
import fs from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { PrismaClient } from "@prisma/client"
import { gameSlug } from "../lib/seo"

const prisma = new PrismaClient()
const apply = process.argv.includes("--apply")
const OUT_DIR = path.join(process.cwd(), "public", "games")
const SIZE = 256

const UNIVERSE_IDS: Record<string, number> = {
  "Grow a Garden": 7436755782,
  "Steal a Brainrot": 7709344486,
  "Plants vs Brainrot": 8316902627,
  Fisch: 5750914919,
  "Fish It": 6701277882,
  "Anime Last Stand": 4509896324,
  "Anime Vanguards": 5578556129,
  "Adopt Me": 383310974,
  "Blox Fruits": 994732206,
  "Pet Simulator X": 2316994223,
  "Pet Simulator 99": 3317771874,
  "Murder Mystery 2": 66654135,
  "Anime Fighting Simulator": 10321202755,
  "Dragon Adventures": 1235188606,
  "Bubble Gum Simulator": 6504986360,
  "Grand Piece Online": 648454481,
  "Steal An Egg": 10563114921,
  "99 Nights in the Forest": 7326934954,
  Rivals: 6035872082,
  "Blade Ball": 4777817887,
  Jailbreak: 245662005,
  "Da Hood": 1008451066,
  "Bee Swarm Simulator": 601130232,
  "Toilet Tower Defense": 4778845442,
  "Anime Rangers X": 9774981774,
  "Dead Rails": 7018190066,
  "Jujutsu Shenanigans": 3508322461,
  Forsaken: 6331902150,
  "Dress to Impress": 5203828273,
  "Brookhaven RP": 1686885941,
}

// Games whose icon is currently a temporary update countdown: use this gallery thumbnail
// (0-based index, picked by eye) cropped to a square instead.
// `skipTop` crops a smaller square starting this many pixels down, below banner text.
const THUMBNAIL_OVERRIDES: Record<string, { index: number; skipTop?: number }> = {
  "99 Nights in the Forest": { index: 2 },
  Fisch: { index: 0 },
  "Fish It": { index: 1 },
  "Grow a Garden": { index: 3, skipTop: 80 },
  "Plants vs Brainrot": { index: 3 },
  "Steal a Brainrot": { index: 2 },
}

async function fetchThumbnailUrls(universeIds: number[]): Promise<Map<number, string[]>> {
  const url = `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeIds.join(",")}&countPerUniverse=5&size=768x432&format=Png`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Thumbnail API returned ${res.status}`)
  const body = (await res.json()) as { data: Array<{ universeId: number; thumbnails: Array<{ imageUrl: string | null }> }> }
  return new Map(body.data.map((d) => [d.universeId, d.thumbnails.map((t) => t.imageUrl).filter((u): u is string => Boolean(u))]))
}

/** A plain tile in the site's style, for entries that aren't a single Roblox experience. */
function generatedTile(label: string, color: string): Buffer {
  const initials = label
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <rect width="100%" height="100%" rx="48" fill="#1c1c1e"/>
    <circle cx="128" cy="128" r="84" fill="${color}"/>
    <text x="128" y="128" dy="0.35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="76" fill="#000">${initials}</text>
  </svg>`
  return Buffer.from(svg)
}

const GENERATED: Record<string, string> = {
  Roblox: "#f5f5f7",
  "Pets Go": "#30d158",
}

async function fetchIconUrls(universeIds: number[]): Promise<Map<number, string>> {
  const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(",")}&size=512x512&format=Png&isCircular=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Thumbnail API returned ${res.status}`)
  const body = (await res.json()) as { data: Array<{ targetId: number; state: string; imageUrl: string | null }> }
  return new Map(body.data.filter((d) => d.state === "Completed" && d.imageUrl).map((d) => [d.targetId, d.imageUrl!]))
}

async function main() {
  const games = await prisma.game.findMany({ where: { isActive: true }, select: { id: true, name: true, displayName: true, image: true } })
  const iconUrls = await fetchIconUrls(Object.values(UNIVERSE_IDS))
  const thumbnailUrls = await fetchThumbnailUrls(Object.keys(THUMBNAIL_OVERRIDES).map((name) => UNIVERSE_IDS[name]))
  for (const [name, { index }] of Object.entries(THUMBNAIL_OVERRIDES)) {
    const thumb = thumbnailUrls.get(UNIVERSE_IDS[name])?.[index]
    if (thumb) iconUrls.set(UNIVERSE_IDS[name], thumb)
  }
  if (apply) await fs.mkdir(OUT_DIR, { recursive: true })

  for (const game of games) {
    const file = `${gameSlug(game.displayName)}.webp`
    const universeId = UNIVERSE_IDS[game.name]
    const iconUrl = universeId ? iconUrls.get(universeId) : undefined
    const tileColor = GENERATED[game.name]

    if (!iconUrl && !tileColor) {
      console.log(`skip      ${game.name}: no icon found`)
      continue
    }
    console.log(`${iconUrl ? "download" : "generate"}  ${game.name} -> /games/${file}`)
    if (!apply) continue

    const source = iconUrl ? Buffer.from(await (await fetch(iconUrl)).arrayBuffer()) : generatedTile(game.displayName, tileColor)
    const skipTop = THUMBNAIL_OVERRIDES[game.name]?.skipTop
    let image = sharp(source)
    if (skipTop) {
      const { width = 0, height = 0 } = await image.metadata()
      const side = height - skipTop
      image = sharp(await image.extract({ left: Math.round((width - side) / 2), top: skipTop, width: side, height: side }).toBuffer())
    }
    await image.resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 82 }).toFile(path.join(OUT_DIR, file))
    await prisma.game.update({ where: { id: game.id }, data: { image: `/games/${file}` } })
  }

  console.log(apply ? "\nDone." : "\nDry run: pass --apply to download and update the database.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
