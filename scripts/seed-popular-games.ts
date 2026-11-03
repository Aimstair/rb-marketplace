/**
 * Adds popular Roblox games, their item types and currencies (based on Roblox's top-played
 * and trading charts, October and November 2026). Additive only: existing games, items and
 * currencies are never changed or deleted, so it is safe to run more than once.
 *
 *   pnpm tsx scripts/seed-popular-games.ts           # dry run: prints what would be added
 *   pnpm tsx scripts/seed-popular-games.ts --apply   # writes to the database in DATABASE_URL
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const apply = process.argv.includes("--apply")

// itemType doubles as the marketplace "type" filter, so each type a game offers gets its own value
interface ItemType {
  name: string
  itemType: string
  category?: string
}

interface GameSeed {
  name: string
  description: string
  items: ItemType[]
  currencies?: string[]
}

const GAMEPASS: ItemType = { name: "Gamepass", itemType: "Gamepass" }
const ACCOUNT: ItemType = { name: "Account", itemType: "Account", category: "Accounts" }
const IN_GAME: ItemType = { name: "In-game Item", itemType: "In-game Item" }
const SERVICE: ItemType = { name: "Service", itemType: "Services" }

const GAMES: GameSeed[] = [
  // New games
  {
    name: "Steal An Egg",
    description: "Hatch, steal and collect pets that earn money",
    items: [{ name: "Pet", itemType: "Pet" }, { name: "Egg", itemType: "Egg" }, GAMEPASS, ACCOUNT],
  },
  {
    name: "99 Nights in the Forest",
    description: "Survive 99 nights in a monster-filled forest",
    items: [{ name: "Class", itemType: "Class" }, GAMEPASS, SERVICE, ACCOUNT],
    currencies: ["Diamonds"],
  },
  {
    name: "Rivals",
    description: "Competitive first-person shooter duels",
    items: [{ name: "Skin", itemType: "Skin" }, { name: "Wrap", itemType: "Wrap" }, GAMEPASS, ACCOUNT],
    currencies: ["Keys"],
  },
  {
    name: "Blade Ball",
    description: "Deflect the homing ball to be the last one standing",
    items: [{ name: "Sword", itemType: "Sword" }, { name: "Explosion", itemType: "Explosion" }, GAMEPASS, ACCOUNT],
    currencies: ["Coins"],
  },
  {
    name: "Jailbreak",
    description: "Cops and robbers open-world heists",
    items: [{ name: "Vehicle", itemType: "Vehicle" }, { name: "Customization", itemType: "Customization" }, GAMEPASS, ACCOUNT],
    currencies: ["Cash"],
  },
  {
    name: "Da Hood",
    description: "Street combat role-play",
    items: [{ name: "Skin", itemType: "Skin" }, GAMEPASS, ACCOUNT],
    currencies: ["DHC"],
  },
  {
    name: "Bee Swarm Simulator",
    description: "Raise bees, collect pollen and make honey",
    items: [{ name: "Beequip", itemType: "Beequip" }, { name: "Sticker", itemType: "Sticker" }, GAMEPASS, ACCOUNT],
    currencies: ["Honey"],
  },
  {
    name: "Toilet Tower Defense",
    description: "Tower defense with collectible units",
    items: [{ name: "Unit", itemType: "Unit" }, GAMEPASS, ACCOUNT],
    currencies: ["Gems"],
  },
  {
    name: "Anime Rangers X",
    description: "Anime tower defense with summonable units",
    items: [{ name: "Unit", itemType: "Unit" }, IN_GAME, GAMEPASS, ACCOUNT],
    currencies: ["Gems"],
  },
  {
    name: "Pets Go",
    description: "Pet collecting and trading from the Pet Simulator team",
    items: [{ name: "Pet", itemType: "Pet" }, { name: "Huge Pet", itemType: "Huge Pet" }, GAMEPASS, ACCOUNT],
    currencies: ["Diamonds"],
  },
  {
    name: "Dead Rails",
    description: "Survive a train ride across the Wild West",
    items: [{ name: "Class", itemType: "Class" }, GAMEPASS, SERVICE, ACCOUNT],
    currencies: ["Bonds"],
  },
  {
    name: "Jujutsu Shenanigans",
    description: "Jujutsu Kaisen inspired battlegrounds",
    items: [{ name: "Skin", itemType: "Skin" }, GAMEPASS, ACCOUNT],
  },
  {
    name: "Forsaken",
    description: "Asymmetric survival horror",
    items: [{ name: "Skin", itemType: "Skin" }, GAMEPASS, ACCOUNT],
  },
  {
    name: "Dress to Impress",
    description: "Fashion role-play and runway competitions",
    items: [IN_GAME, GAMEPASS, ACCOUNT],
  },
  {
    name: "Brookhaven RP",
    description: "Town and city role-play",
    items: [GAMEPASS, ACCOUNT],
  },

  // Tower defense (November 2026)
  {
    name: "Anime Adventures",
    description: "Anime tower defense: summon heroes and defend multiple worlds",
    items: [{ name: "Unit", itemType: "Unit" }, IN_GAME, GAMEPASS, ACCOUNT],
    currencies: ["Gems"],
  },
  {
    name: "Tower Defense Simulator",
    description: "Co-op tower defense against hordes of zombies and bosses",
    items: [{ name: "Skin", itemType: "Skin" }, GAMEPASS, SERVICE, ACCOUNT],
    currencies: ["Gems"],
  },
  {
    name: "Garden Tower Defense",
    description: "Grow plant units with special attacks to defend your base",
    items: [{ name: "Unit", itemType: "Unit" }, GAMEPASS, ACCOUNT],
  },
  {
    name: "All Star Tower Defense",
    description: "Summon anime units from the gate and fend off waves",
    items: [{ name: "Unit", itemType: "Unit" }, GAMEPASS, ACCOUNT],
    currencies: ["Gems"],
  },
  {
    name: "Five Nights TD 2",
    description: "Five Nights at Freddy's tower defense with collectible animatronics",
    items: [{ name: "Unit", itemType: "Unit" }, GAMEPASS, ACCOUNT],
  },
  {
    name: "Tower Defense X",
    description: "Air, land and sea tower warfare against powerful bosses",
    items: [{ name: "Skin", itemType: "Skin" }, GAMEPASS, ACCOUNT],
  },
  {
    name: "Tower Heroes",
    description: "Tower defense with unique heroes, skins and weekly challenges",
    items: [{ name: "Skin", itemType: "Skin" }, GAMEPASS, ACCOUNT],
    currencies: ["Coins"],
  },

  // Pet games (November 2026)
  {
    name: "Tap Simulator Reborn",
    description: "Tap for coins, hatch rare and secret pets, rebirth and unlock islands",
    items: [{ name: "Pet", itemType: "Pet" }, GAMEPASS, ACCOUNT],
    currencies: ["Coins"],
  },
  {
    name: "Rebirth Champions Ultimate",
    description: "Click, rebirth and hatch eggs for stronger pets",
    items: [{ name: "Pet", itemType: "Pet" }, GAMEPASS, ACCOUNT],
  },
  {
    name: "Ride A Pet",
    description: "Hatch and mutate faster pets to ride and find rarer eggs",
    items: [{ name: "Pet", itemType: "Pet" }, GAMEPASS, ACCOUNT],
  },
  {
    name: "Arm Wrestle Simulator",
    description: "Train, wrestle and rebirth with thousands of pets and arms",
    items: [{ name: "Pet", itemType: "Pet" }, { name: "Arm", itemType: "Arm" }, GAMEPASS, ACCOUNT],
  },
  {
    name: "Creatures of Sonaria",
    description: "Grow and trade kaiju creatures in a survival world",
    items: [{ name: "Creature", itemType: "Creature" }, GAMEPASS, ACCOUNT],
    currencies: ["Mush"],
  },
  {
    name: "Royale High",
    description: "Fantasy dress-up role-play with collectible sets and halos",
    items: [{ name: "Halo", itemType: "Halo" }, IN_GAME, GAMEPASS, ACCOUNT],
    currencies: ["Diamonds"],
  },

  // Other popular games (November 2026)
  {
    name: "The Strongest Battlegrounds",
    description: "Train and fight to be the strongest in anime battlegrounds",
    items: [GAMEPASS, ACCOUNT],
  },
  {
    name: "Blue Lock Rivals",
    description: "5v5 Blue Lock inspired soccer with ego abilities",
    items: [GAMEPASS, SERVICE, ACCOUNT],
  },
  {
    name: "Volleyball Legends",
    description: "Fast-paced 6v6 casual and ranked volleyball",
    items: [GAMEPASS, SERVICE, ACCOUNT],
    currencies: ["Yen"],
  },
  {
    name: "BedWars",
    description: "Protect your bed and destroy your rivals' in team battles",
    items: [{ name: "Kit", itemType: "Kit" }, GAMEPASS, ACCOUNT],
  },
  {
    name: "Doors",
    description: "Horror escape through rooms full of entities",
    items: [GAMEPASS, ACCOUNT],
    currencies: ["Knobs"],
  },
  {
    name: "Sol's RNG",
    description: "Roll for rare auras, craft gear and brew luck potions",
    items: [GAMEPASS, SERVICE, ACCOUNT],
  },
  {
    name: "Arise Crossover",
    description: "Turn enemies into shadows and become the Shadow Monarch",
    items: [GAMEPASS, SERVICE, ACCOUNT],
  },
  {
    name: "Ink Game",
    description: "Survive deadly Squid Game inspired challenges",
    items: [GAMEPASS, ACCOUNT],
  },
  {
    name: "Welcome to Bloxburg",
    description: "Build homes, work jobs and role-play in town",
    items: [GAMEPASS, SERVICE, ACCOUNT],
    currencies: ["Money"],
  },
  {
    name: "Build A Boat For Treasure",
    description: "Build a ship and sail through obstacles for treasure",
    items: [GAMEPASS, ACCOUNT],
    currencies: ["Gold"],
  },
  {
    name: "King Legacy",
    description: "One Piece inspired adventure with devil fruits",
    items: [{ name: "Fruit", itemType: "Fruit" }, GAMEPASS, SERVICE, ACCOUNT],
    currencies: ["Beli", "Gems"],
  },
  {
    name: "Arsenal",
    description: "Fast-paced arcade shooter with a rotating arsenal of weapons",
    items: [{ name: "Skin", itemType: "Skin" }, GAMEPASS, ACCOUNT],
    currencies: ["BattleBucks"],
  },
  {
    name: "Basketball Zero",
    description: "5v5 anime basketball with class abilities",
    items: [GAMEPASS, SERVICE, ACCOUNT],
  },
  {
    name: "Shindo Life",
    description: "Ninja RPG with bloodlines, spins and boss battles",
    items: [GAMEPASS, SERVICE, ACCOUNT],
    currencies: ["RELLcoins"],
  },

  // Existing games: item types and currencies they were missing
  {
    name: "Murder Mystery 2",
    description: "Mystery and role-playing game",
    items: [{ name: "Knife", itemType: "Knife" }, { name: "Gun", itemType: "Gun" }, { name: "Pet", itemType: "Pet" }],
  },
  { name: "Pet Simulator 99", description: "Latest pet collection game", items: [{ name: "Huge Pet", itemType: "Huge Pet" }], currencies: ["Diamonds"] },
  { name: "Blox Fruits", description: "One Piece inspired adventure game", items: [SERVICE], currencies: ["Beli", "Fragments"] },
  { name: "Grow a Garden", description: "Grow your own virtual garden", items: [{ name: "Seed", itemType: "Seed" }] },
  { name: "Anime Last Stand", description: "Anime tower defense game", items: [], currencies: ["Gems"] },
  { name: "Fisch", description: "Fishing adventure game", items: [{ name: "Rod", itemType: "Rod" }] },
  { name: "Steal a Brainrot", description: "Brainrot themed game", items: [{ name: "Brainrot", itemType: "Brainrot" }] },
]

async function main() {
  const existingGames = await prisma.game.findMany({
    include: { items: { select: { name: true, order: true } }, currencies: { select: { name: true, order: true } } },
  })
  const byName = new Map(existingGames.map((g) => [g.name.toLowerCase(), g]))
  let nextGameOrder = Math.max(0, ...existingGames.map((g) => g.order)) + 1
  const added: string[] = []

  for (const seed of GAMES) {
    let game = byName.get(seed.name.toLowerCase())

    if (!game) {
      added.push(`game      ${seed.name}`)
      if (apply) {
        const created = await prisma.game.create({
          data: { name: seed.name, displayName: seed.name, description: seed.description, order: nextGameOrder },
        })
        game = { ...created, items: [], currencies: [] }
      }
      nextGameOrder++
    }

    const itemNames = new Set((game?.items ?? []).map((i) => i.name.toLowerCase()))
    let itemOrder = Math.max(-1, ...(game?.items ?? []).map((i) => i.order)) + 1
    for (const item of seed.items) {
      if (itemNames.has(item.name.toLowerCase())) continue
      added.push(`item      ${seed.name} › ${item.name}`)
      if (apply && game) {
        await prisma.gameItem.create({
          data: {
            gameId: game.id,
            name: item.name,
            displayName: item.name,
            category: item.category ?? "Games",
            itemType: item.itemType,
            order: itemOrder,
          },
        })
      }
      itemOrder++
    }

    const currencyNames = new Set((game?.currencies ?? []).map((c) => c.name.toLowerCase()))
    let currencyOrder = Math.max(-1, ...(game?.currencies ?? []).map((c) => c.order)) + 1
    for (const currency of seed.currencies ?? []) {
      if (currencyNames.has(currency.toLowerCase())) continue
      added.push(`currency  ${seed.name} › ${currency}`)
      if (apply && game) {
        await prisma.gameCurrency.create({
          data: { gameId: game.id, name: currency, displayName: currency, order: currencyOrder },
        })
      }
      currencyOrder++
    }
  }

  console.log(added.length ? added.join("\n") : "Nothing to add: the database already has everything.")
  console.log(`\n${added.length} rows ${apply ? "added" : "would be added (dry run, pass --apply to write)"}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
