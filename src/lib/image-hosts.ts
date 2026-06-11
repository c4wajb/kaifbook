// Single source of truth for external image hosts. next.config.ts builds its
// remotePatterns from this list, and validation (server + client) rejects any
// host not listed here — otherwise an owner could save a URL that next/image
// refuses to optimize (400 from /_next/image, broken picture on every page).
export const ALLOWED_IMAGE_HOSTS = [
  "kaifbook.ru",
  "www.kaifbook.ru",
  "stolix.ru",
  "www.stolix.ru",
  "images.unsplash.com",
  "welcomekursk.ru",
  "static.tildacdn.com",
  "butylochnaya.ru",
] as const;

export function isAllowedImageHostUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(url.hostname);
  } catch {
    return false;
  }
}
