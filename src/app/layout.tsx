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
  title: "Deutschbook",
  description: "Your personal German learning workbook",
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
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <Link href="/" className="font-bold text-lg tracking-tight text-blue-700">
            Deutschbook
          </Link>
          <Link href="/sessions" className="text-sm text-gray-600 hover:text-gray-900">
            Sessions
          </Link>
          <Link href="/book" className="text-sm text-gray-600 hover:text-gray-900">
            Book
          </Link>
          <Link href="/vocab" className="text-sm text-gray-600 hover:text-gray-900">
            Vocabulary
          </Link>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
