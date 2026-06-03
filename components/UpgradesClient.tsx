'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { materials, getMaterialById, type Material } from '@/lib/materials'
import { factions } from '@/lib/factions'
import { useTracker, getSavedUser } from '@/lib/store'
import Link from 'next/link'

export default function UpgradesClient() {
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null)
  const [spendAmounts, setSpendAmounts] = useState<Record<string, string>>({})
  const [flash, setFlash] = useState<Record<string, 'success' | 'warn'>>({})

  useEffect(() => {
    const u = getSavedUser()
    if (u) setUserId(u.id)
  }, [])

  const { getState, adjustHave, loading } = useTracker(userId)

  // Which materials to show: faction-filtered if selected, else all where have > 0
  const visibleMaterials: Material[] = (() => {
    if (selectedFaction) {
      const faction = factions.find(f => f.id === selectedFaction)
      if (!faction) return []
      return faction.materials
        .map(({ materialId }) => getMaterialById(materialId))
        .filter((m): m is Material => !!m)
    }
    // No faction: show everything the user has at least 1 of
    return materials.filter(m => getState(m.id).have > 0)
  })()

  function handleSpend(materialId: string) {
    const raw = spendAmounts[materialId]
    const amount = parseInt(raw || '0')
    if (!amount || amount <= 0) return

    const current = getState(materialId).have
    if (amount > current) {
      setFlash(f => ({ ...f, [materialId]: 'warn' }))
      setTimeout(() => setFlash(f => { const n = { ...f }; delete n[materialId]; return n }), 1000)
      return
    }

    adjustHave(materialId, -amount)
    setSpendAmounts(s => ({ ...s, [materialId]: '' }))
    setFlash(f => ({ ...f, [materialId]: 'success' }))
    setTimeout(() => setFlash(f => { const n = { ...f }; delete n[materialId]; return n }), 800)
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>, materialId: string) {
    if (e.key === 'Enter') handleSpend(materialId)
  }

  if (!userId) {
    return (
      <div className="text-gray-500 text-sm mt-8">
        <Link href="/" className="text-[#b8ff00] hover:underline">Sign in on the tracker</Link> first.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white tracking-wide">Upgrades</h1>
        <p className="text-xs text-gray-500 mt-1">Log what you spend — deducts from your stash</p>
      </div>

      {/* Faction picker */}
      <div className="flex flex-wrap gap-2 mb-8">
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
      ) : visibleMaterials.length === 0 ? (
        <div className="border border-gray-800 rounded-lg px-6 py-10 text-center">
          <div className="text-gray-400 text-sm">
            {selectedFaction
              ? "You don't have any of these materials yet"
              : "You don't have any materials in your stash"}
          </div>
          <div className="text-gray-600 text-xs mt-1">Update your counts on the Tracker page</div>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleMaterials.map(m => {
            const s = getState(m.id)
            const amount = parseInt(spendAmounts[m.id] || '0') || 0
            const afterSpend = s.have - amount
            const isOver = amount > s.have
            const flashState = flash[m.id]

            return (
              <div
                key={m.id}
                className={`flex items-center gap-4 border rounded-lg px-4 py-3 transition-colors ${
                  flashState === 'success'
                    ? 'border-green-500/50 bg-green-500/5'
                    : flashState === 'warn'
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Image + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {m.image && (
                    <Image
                      src={m.image}
                      alt={m.name}
                      width={40}
                      height={40}
                      className="rounded shrink-0 object-contain bg-gray-800/50"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{m.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Have{' '}
                      <span className={`font-bold ${isOver ? 'text-red-400' : 'text-white'}`}>
                        {s.have}
                      </span>
                      {amount > 0 && !isOver && (
                        <span className="text-gray-600"> → <span className="text-[#b8ff00]">{afterSpend}</span></span>
                      )}
                      {isOver && (
                        <span className="text-red-400"> — not enough!</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Spend controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const cur = parseInt(spendAmounts[m.id] || '1')
                      setSpendAmounts(s => ({ ...s, [m.id]: String(Math.max(1, cur - 1)) }))
                    }}
                    className="w-7 h-7 rounded border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-colors flex items-center justify-center text-sm"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={spendAmounts[m.id] ?? ''}
                    placeholder="0"
                    onChange={e => setSpendAmounts(s => ({ ...s, [m.id]: e.target.value }))}
                    onKeyDown={e => handleKey(e, m.id)}
                    className="w-14 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-center text-white text-sm focus:outline-none focus:border-[#b8ff00] transition-colors"
                  />
                  <button
                    onClick={() => {
                      const cur = parseInt(spendAmounts[m.id] || '0')
                      setSpendAmounts(s => ({ ...s, [m.id]: String(cur + 1) }))
                    }}
                    className="w-7 h-7 rounded border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-colors flex items-center justify-center text-sm"
                  >
                    +
                  </button>
                  <button
                    onClick={() => handleSpend(m.id)}
                    disabled={!amount || amount <= 0 || isOver}
                    className="ml-1 px-4 py-1.5 bg-[#b8ff00] text-black text-xs font-bold rounded hover:bg-[#a3e600] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Spend
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
