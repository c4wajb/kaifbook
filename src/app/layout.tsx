import type { Metadata, Viewport } from "next";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { CookieConsent } from "@/components/CookieConsent";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import "./globals.css";
export const metadata: Metadata = { title: "Kaifbook", description: "MVP цифровой системы бронирования ресторанов" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" data-scroll-behavior="smooth" suppressHydrationWarning><body suppressHydrationWarning><AppHeader /><main>{children}</main><AppFooter /><ScrollToTopButton /><CookieConsent /></body></html>; }
