import { NextResponse, type NextRequest } from "next/server";

const clientHosts = new Set(["kaifbook.ru", "www.kaifbook.ru"]);
const officeHosts = new Set(["stolix.ru", "www.stolix.ru"]);
const clientOrigin = "https://www.kaifbook.ru";
const officeOrigin = "https://www.stolix.ru";

const assetPrefixes = ["/_next", "/uploads"];
const passthroughPrefixes = ["/api"];
const officePrefixes = ["/owner", "/admin", "/dashboard", "/businesses", "/login", "/register", "/stolix", "/server"];
const clientPrefixes = [
  "/restaurants",
  "/guest",
  "/reservation",
  "/r",
  "/b",
  "/for-restaurants",
  "/payment",
  "/privacy",
  "/terms",
  "/vk-mini",
];

function normalizedHost(request: NextRequest) {
  return (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(":")[0].toLowerCase();
}

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirectTo(origin: string, request: NextRequest, pathname = request.nextUrl.pathname) {
  const url = request.nextUrl.clone();
  const target = new URL(`${pathname}${url.search}${url.hash}`, origin);
  return NextResponse.redirect(target, 307);
}

function shouldSkipDomainRouting(pathname: string) {
  if (pathname === "/favicon.ico" || pathname === "/icon.svg" || pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  return startsWithAny(pathname, [...assetPrefixes, ...passthroughPrefixes]);
}

export function proxy(request: NextRequest) {
  const host = normalizedHost(request);
  const pathname = request.nextUrl.pathname;

  if (!shouldSkipDomainRouting(pathname)) {
    if (clientHosts.has(host) && startsWithAny(pathname, officePrefixes)) {
      return redirectTo(clientOrigin, request, "/restaurants");
    }

    if (officeHosts.has(host)) {
      if (pathname === "/") return redirectTo(officeOrigin, request, "/owner/login");
      if (pathname === "/server") {
        return NextResponse.rewrite(new URL("/stolix/server", request.url));
      }
      if (startsWithAny(pathname, clientPrefixes)) return redirectTo(clientOrigin, request);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-path", pathname);
  requestHeaders.set("x-current-host", host);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
