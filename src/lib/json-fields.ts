export function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {}
  return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
}
export function stringifyStringList(value: unknown): string { return JSON.stringify(parseStringList(value)); }
export function listToText(value: unknown): string { return parseStringList(value).join(", "); }
