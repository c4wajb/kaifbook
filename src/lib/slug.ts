import { prisma } from "@/lib/db";

const translit: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(value: string) {
  return value.trim().toLowerCase().split("").map((char) => translit[char] ?? char).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "item";
}

export async function createUniqueBusinessSlug(name: string, city: string, currentId?: string) {
  const base = slugify(`${name}-${city}`);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.business.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

export async function createUniqueRestaurantSlug(title: string, requestedSlug?: string | null, currentId?: string) {
  const base = slugify(requestedSlug || title);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.restaurant.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}
