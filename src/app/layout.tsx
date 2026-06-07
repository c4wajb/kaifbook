import type { Metadata, Viewport } from "next";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import "./globals.css";
export const metadata: Metadata = { title: "Kaifbook", description: "MVP цифровой системы бронирования ресторанов" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body><AppHeader /><main>{children}</main><AppFooter /><ScrollToTopButton /></body></html>; }
