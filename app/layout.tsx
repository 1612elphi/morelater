import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "More Later",
  description: "Content calendar — more on that later.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <div className="flex h-screen flex-col">
          <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              More Later
            </Link>
            <Link
              href="/settings"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Settings
            </Link>
          </header>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
