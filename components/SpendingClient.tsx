'use client'

import { useEffect, useState } from 'react'
import { materials, getMaterialById, type Material } from '@/lib/materials'
import { factions } from '@/lib/factions'
import { useTracker, getSavedUser } from '@/lib/store'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const UpgradesVault = dynamic(() => import('./UpgradesVault'), { ssr: false })

export default function SpendingClient() {
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null)

  useEffect(() => {
    const u = getSavedUser()
    if (u) setUserId(u.id)
  }, [])

  const { getState, loading } = useTracker(userId)

  if (!userId) {
    return (
      <div className="text-gray-500 text-sm mt-8">
        <Link href="/" className="text-[#b8ff00] hover:underline">Sign in on the vault</Link> first.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white tracking-wide">Spending</h1>
        <p className="text-xs text-gray-500 mt-1">Click items to spend 1 — reduces both have and remaining</p>
      </div>

      {/* Faction picker */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedFaction(null)}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            selectedFaction === null
              ? 'bg-white/10 border-gray-400 text-white'
              : 'border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          All I have
        </button>
        {factions.filter(f => !f.tbc).map(f => (
          <button
            key={f.id}
            onClick={() => setSelectedFaction(selectedFaction === f.id ? null : f.id)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              selectedFaction === f.id
                ? `${f.bgColor} ${f.borderColor} ${f.color}`
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <UpgradesVault userId={userId} selectedFaction={selectedFaction} />
      )}
    </div>
  )
}
