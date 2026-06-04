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
        <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-[#b8ff00] font-bold tracking-widest uppercase text-sm hover:opacity-80 shrink-0">
            ◈ Marathon Salvage
          </Link>

          <nav className="flex gap-4 text-xs text-gray-400 items-center">
            <Link href="/" className="hover:text-gray-100 transition-colors">Vault</Link>
            <Link href="/factions" className="hover:text-gray-100 transition-colors">Factions</Link>
            <Link href="/spending" className="hover:text-gray-100 transition-colors">Spending</Link>
            <Link href="/barter" className="hover:text-gray-100 transition-colors">Barter</Link>
            <Link href="/maxing" className="hover:text-gray-100 transition-colors">Maxing</Link>
            <Link href="/maps" className="hover:text-gray-100 transition-colors">Maps</Link>

            {/* Other dropdown */}
            <div className="relative group">
              <button className="hover:text-gray-100 transition-colors">More ▼</button>
              <div className="absolute right-0 mt-0 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link href="/cheat-sheet" className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-800 border-b border-gray-800">
                  Cheat Sheet
                </Link>
                <Link href="/materials" className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-800">
                  All Materials
                </Link>
              </div>
            </div>
          </nav>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
