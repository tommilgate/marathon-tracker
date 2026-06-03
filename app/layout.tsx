import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const mono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Marathon Salvage Tracker',
  description: 'Track your Marathon crafting materials',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${mono.className} bg-[#0a0a0a] text-gray-100 min-h-screen`}>
        <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-6">
          <Link href="/" className="text-[#b8ff00] font-bold tracking-widest uppercase text-sm hover:opacity-80">
            ◈ Marathon Salvage
          </Link>
          <nav className="flex gap-4 text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-100 transition-colors">Tracker</Link>
            <Link href="/upgrades" className="hover:text-gray-100 transition-colors">Upgrades</Link>
            <Link href="/factions" className="hover:text-gray-100 transition-colors">Factions</Link>
            <Link href="/maps" className="hover:text-gray-100 transition-colors">Maps</Link>
            <Link href="/cheat-sheet" className="hover:text-gray-100 transition-colors">Cheat Sheet</Link>
            <Link href="/materials" className="hover:text-gray-100 transition-colors">All Materials</Link>
          </nav>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
