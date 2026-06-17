import type { Metadata, Viewport } from "next";
import { Golos_Text, Playfair_Display } from "next/font/google";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import "./globals.css";

// Interface/body text. Cyrillic-native variable font; mapped to --font-sans in :root.
const fontSans = Golos_Text({ subsets: ["latin", "cyrillic"], variable: "--font-golos", display: "swap" });
// Headings. Brand serif (variable font keeps the exact heading weights); mapped to --font-serif in :root.
const fontSerif = Playfair_Display({ subsets: ["latin", "cyrillic"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = { title: "Kaifbook", description: "MVP цифровой системы бронирования ресторанов" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" data-scroll-behavior="smooth" suppressHydrationWarning className={`${fontSans.variable} ${fontSerif.variable}`}><body suppressHydrationWarning><AppHeader /><main>{children}</main><AppFooter /><ScrollToTopButton /><CookieConsent /></body></html>; }
