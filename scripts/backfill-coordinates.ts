/**
 * Backfill restaurant coordinates from their address via the Yandex Geocoder.
 *
 * Self-contained (no app imports) so it runs cleanly under tsx. Requires a key:
 *
 *   YANDEX_GEOCODER_KEY=xxxx npx tsx scripts/backfill-coordinates.ts
 *   # add --force to re-geocode rows that already have coordinates
 *
 * Only rows missing latitude/longitude are touched by default. Rate-limited to
 * stay within the Geocoder free tier. Safe to re-run.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APIKEY = process.env.YANDEX_GEOCODER_KEY;
const FORCE = process.argv.includes("--force");
const ENDPOINT = "https://geocode-maps.yandex.ru/1.x/";

async function geocode(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const url = `${ENDPOINT}?apikey=${APIKEY}&format=json&results=1&lang=ru_RU&geocode=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`  ! Yandex ${res.status} for "${query}"`);
      return null;
    }
    const data = (await res.json()) as {
      response?: { GeoObjectCollection?: { featureMember?: Array<{ GeoObject?: { Point?: { pos?: string } } }> } };
    };
    const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
    if (!pos) return null;
    const [lonStr, latStr] = pos.split(" "); // Yandex order: "lon lat"
    const longitude = Number(lonStr);
    const latitude = Number(latStr);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  } catch (error) {
    console.warn(`  ! request failed for "${query}":`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  if (!APIKEY) {
    console.error("YANDEX_GEOCODER_KEY is not set. Get a Geocoder API key at");
    console.error("https://developer.tech.yandex.ru/services and re-run:");
    console.error("  YANDEX_GEOCODER_KEY=xxxx npx tsx scripts/backfill-coordinates.ts");
    process.exit(1);
  }

  const targets = await prisma.restaurant.findMany({
    where: FORCE ? {} : { OR: [{ latitude: null }, { longitude: null }] },
    select: { id: true, slug: true, city: true, address: true },
  });
  console.log(`${targets.length} restaurant(s) to geocode${FORCE ? " (--force: all)" : " (missing coords)"}.\n`);

  let updated = 0;
  for (const r of targets) {
    const query = [r.city, r.address].filter(Boolean).join(", ");
    if (!query) {
      console.log(`${r.slug}: no address — skipped`);
      continue;
    }
    const coords = await geocode(query);
    if (!coords) {
      console.log(`${r.slug}: not found`);
      continue;
    }
    await prisma.restaurant.update({ where: { id: r.id }, data: coords });
    updated++;
    console.log(`${r.slug}: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
    await new Promise((resolve) => setTimeout(resolve, 250)); // be gentle on the free tier
  }

  console.log(`\nDone — updated ${updated}/${targets.length}.`);
}

main().finally(() => prisma.$disconnect());
