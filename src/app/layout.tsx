import type { Metadata, Viewport } from "next";
import { Golos_Text, Playfair_Display } from "next/font/google";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { CookieConsent } from "@/components/CookieConsent";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import "./globals.css";

// Interface/body text. Cyrillic-native variable font exposed as --font-sans.
const fontSans = Golos_Text({ subsets: ["latin", "cyrillic"], variable: "--font-sans", display: "swap" });
// Headings. Brand serif exposed as --font-serif (replaces the Georgia fallback).
const fontSerif = Playfair_Display({ subsets: ["latin", "cyrillic"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = { title: "Kaifbook", description: "MVP цифровой системы бронирования ресторанов" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" data-scroll-behavior="smooth" suppressHydrationWarning className={`${fontSans.variable} ${fontSerif.variable}`}><body suppressHydrationWarning><AppHeader /><main>{children}</main><AppFooter /><ScrollToTopButton /><CookieConsent /></body></html>; }
