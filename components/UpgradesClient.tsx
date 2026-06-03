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

  const { getState, spend, loading } = useTracker(userId)

  const visibleMaterials: Material[] = (() => {
    if (selectedFaction) {
      const faction = factions.find(f => f.id === selectedFaction)
      if (!faction) return []
      return faction.materials
        .map(({ materialId }) => getMaterialById(materialId))
        .filter((m): m is Material => !!m)
    }
    return materials.filter(m => getState(m.id).have > 0)
  })()

  function handleSpend(materialId: string) {
    const amount = parseInt(spendAmounts[materialId] || '0')
    if (!amount || amount <= 0) return

    const current = getState(materialId)
    if (amount > current.have) {
      setFlash(f => ({ ...f, [materialId]: 'warn' }))
      setTimeout(() => setFlash(f => { const n = { ...f }; delete n[materialId]; return n }), 1000)
      return
    }

    spend(materialId, amount)
    setSpendAmounts(s => ({ ...s, [materialId]: '' }))
    setFlash(f => ({ ...f, [materialId]: 'success' }))
    setTimeout(() => setFlash(f => { const n = { ...f }; delete n[materialId]; return n }), 800)
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
        <p className="text-xs text-gray-500 mt-1">Spending deducts from both Have and Remaining</p>
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
            {selectedFaction ? "You don't have any of these materials yet" : "You don't have any materials in your stash"}
          </div>
          <div className="text-gray-600 text-xs mt-1">Update your counts on the Tracker page</div>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleMaterials.map(m => {
            const s = getState(m.id)
            const remaining = Math.max(0, s.need - s.have)
            const amount = parseInt(spendAmounts[m.id] || '0') || 0
            const isOver = amount > s.have
            const flashState = flash[m.id]

            return (
              <div
                key={m.id}
                className={`flex items-center gap-4 border rounded-lg px-4 py-3 transition-colors ${
                  flashState === 'success' ? 'border-green-500/50 bg-green-500/5'
                  : flashState === 'warn' ? 'border-red-500/50 bg-red-500/5'
                  : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Image + name + stats */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {m.image && (
                    <Image src={m.image} alt={m.name} width={56} height={56}
                      className="rounded shrink-0 object-contain bg-gray-800/50" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm font-medium truncate">{m.name}</div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {/* Remaining — most important */}
                      <div>
                        <span className="text-gray-500 text-xs">Still need </span>
                        <span className={`text-sm font-bold ${remaining === 0 ? 'text-green-400' : 'text-white'}`}>
                          {remaining === 0 ? '✓' : remaining}
                        </span>
                      </div>
                      <span className="text-gray-700 text-xs">·</span>
                      <div className="text-xs text-gray-500">
                        Have <span className={`font-medium ${isOver ? 'text-red-400' : 'text-gray-300'}`}>{s.have}</span>
                      </div>
                      {amount > 0 && !isOver && (
                        <div className="text-xs text-gray-600">
                          → have <span className="text-[#b8ff00]">{s.have - amount}</span>
                          {' '}· need <span className="text-[#b8ff00]">{remaining - amount >= 0 ? remaining - amount : 0}</span> left
                        </div>
                      )}
                      {isOver && <span className="text-red-400 text-xs">not enough!</span>}
                    </div>
                  </div>
                </div>

                {/* Spend controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSpendAmounts(s => ({ ...s, [m.id]: String(Math.max(1, (parseInt(s[m.id] || '1') - 1))) }))}
                    className="w-7 h-7 rounded border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-colors flex items-center justify-center text-sm"
                  >−</button>
                  <input
                    type="number"
                    min={1}
                    value={spendAmounts[m.id] ?? ''}
                    placeholder="0"
                    onChange={e => setSpendAmounts(s => ({ ...s, [m.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleSpend(m.id) }}
                    className="w-14 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-center text-white text-sm focus:outline-none focus:border-[#b8ff00] transition-colors"
                  />
                  <button
                    onClick={() => setSpendAmounts(s => ({ ...s, [m.id]: String((parseInt(s[m.id] || '0') + 1)) }))}
                    className="w-7 h-7 rounded border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-colors flex items-center justify-center text-sm"
                  >+</button>
                  <button
                    onClick={() => handleSpend(m.id)}
                    disabled={!amount || amount <= 0 || isOver}
                    className="ml-1 px-4 py-1.5 bg-[#b8ff00] text-black text-xs font-bold rounded hover:bg-[#a3e600] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >Spend</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
