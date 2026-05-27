import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
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
  title: "Deutschbook",
  description: "Your personal German learning workbook",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900">
        <nav className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center gap-6">
          <Link href="/" className="font-bold text-lg tracking-tight text-blue-400">
            Deutschbook
          </Link>
          <Link href="/sessions" className="text-sm text-slate-300 hover:text-white transition-colors">
            Sessions
          </Link>
          <Link href="/book" className="text-sm text-slate-300 hover:text-white transition-colors">
            Book
          </Link>
          <Link href="/quiz" className="text-sm text-slate-300 hover:text-white transition-colors">
            Quiz
          </Link>
          <Link href="/vocab" className="text-sm text-slate-300 hover:text-white transition-colors">
            Vocabulary
          </Link>
          <SearchBar />
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
