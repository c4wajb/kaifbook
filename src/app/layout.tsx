import type { Metadata, Viewport } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import "./globals.css";

// Interface/body text. Cyrillic-native variable font; mapped to --font-text in :root.
const fontSans = Golos_Text({ subsets: ["latin", "cyrillic"], variable: "--font-golos", display: "swap" });
// Display/headings + logo. Unbounded — rounded geometric grotesk with full
// Cyrillic; "kaif" character, no fb-slipping. Mapped to --font-display in :root.
const fontDisplay = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-unbounded", display: "swap" });

export const metadata: Metadata = { title: "Kaifbook", description: "MVP цифровой системы бронирования ресторанов" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" data-scroll-behavior="smooth" suppressHydrationWarning className={`${fontSans.variable} ${fontDisplay.variable}`}><body suppressHydrationWarning><AppHeader /><main>{children}</main><AppFooter /><ScrollToTopButton /><CookieConsent /></body></html>; }
