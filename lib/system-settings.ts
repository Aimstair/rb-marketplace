import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

export const SYSTEM_SETTINGS_TAG = "system-settings"

/**
 * All system settings as a key → value map, read in one query and cached across requests.
 * The root layout reads this on every page, so it must not hit the database each time.
 * Admin writes call `updateTag(SYSTEM_SETTINGS_TAG)` so changes (e.g. maintenance mode) apply immediately.
 */
export const getSystemSettingsMap = unstable_cache(
  async (): Promise<Record<string, string>> => {
    try {
      const rows = await prisma.systemSettings.findMany({ select: { key: true, value: true } })
      return Object.fromEntries(rows.map((row) => [row.key, row.value]))
    } catch (error) {
      console.error("Error fetching system settings:", error)
      return {}
    }
  },
  ["system-settings-map-v1"],
  { revalidate: 60, tags: [SYSTEM_SETTINGS_TAG] },
)

export async function getSystemSettingValue(key: string): Promise<string | undefined> {
  const settings = await getSystemSettingsMap()
  return settings[key]
}
