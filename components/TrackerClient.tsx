'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { materials, TIER_ORDER, TIER_COLORS, TIER_BG, type Tier } from '@/lib/materials'
import { useTracker, getSavedUser, clearUser } from '@/lib/store'
import { getUserPins, pinMaterial, unpinMaterial } from '@/lib/supabase'
import UsernameGate from './UsernameGate'
import dynamic from 'next/dynamic'
const VaultMode = dynamic(() => import('./VaultMode'), { ssr: false })

const MAX_PINS = 3

const TIER_LABELS: Record<Tier, string> = {
  prestige: 'Prestige',
  superior: 'Superior',
  deluxe: 'Deluxe',
  enhanced: 'Enhanced',
  standard: 'Standard',
}

export default function TrackerClient() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = getSavedUser()
    if (saved) setUser(saved)
    setHydrated(true)
  }, [])

  const { getState, setNeed, adjustHave, setHave, loading } = useTracker(user?.id ?? null)
  const [editingNeed, setEditingNeed] = useState<string | null>(null)
  const [editingHave, setEditingHave] = useState<string | null>(null)
  const [filterTier, setFilterTier] = useState<Tier | 'all'>('all')
  const [hideComplete, setHideComplete] = useState(false)
  const [vaultMode, setVaultMode] = useState(false)
  const [pins, setPins] = useState<string[]>([])

  useEffect(() => {
    if (user?.id) getUserPins(user.id).then(setPins).catch(() => {})
  }, [user?.id])

  async function togglePin(materialId: string) {
    if (!user) return
    if (pins.includes(materialId)) {
      await unpinMaterial(user.id, materialId)
      setPins(p => p.filter(id => id !== materialId))
    } else {
      if (pins.length >= MAX_PINS) return
      await pinMaterial(user.id, materialId)
      setPins(p => [...p, materialId])
    }
  }

  if (!hydrated) return null

  if (!user) {
    return <UsernameGate onUser={setUser} />
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-gray-500 text-sm">
        Loading your tracker...
      </div>
    )
  }

  const filtered = materials.filter(m => {
    if (filterTier !== 'all' && m.tier !== filterTier) return false
    if (hideComplete) {
      const s = getState(m.id)
      if (s.need > 0 && s.have >= s.need) return false
    }
    return true
  })

  const totalRemaining = materials.reduce((sum, m) => {
    const s = getState(m.id)
    return sum + Math.max(0, s.need - s.have)
  }, 0)

  const totalNeeded = materials.reduce((sum, m) => sum + getState(m.id).need, 0)

  return (
    <div>
      {/* Vault mode full view */}
      {vaultMode && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-white tracking-wide">Vault Mode</h1>
                <span className="text-xs text-gray-600">—</span>
                <span className="text-xs text-[#b8ff00]">{user.username}</span>
              </div>
            </div>
            <button
              onClick={() => setVaultMode(false)}
              className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded hover:border-gray-500 hover:text-white transition-colors"
            >
              ← List View
            </button>
          </div>
          <VaultMode userId={user.id} />
        </div>
      )}

      {!vaultMode && <>

      {/* Header stats */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white tracking-wide">Salvage Tracker</h1>
            <span className="text-xs text-gray-600">—</span>
            <span className="text-xs text-[#b8ff00]">{user.username}</span>
            <button
              onClick={() => { clearUser(); setUser(null) }}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              (switch)
            </button>
          </div>
          {totalNeeded > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {totalRemaining} remaining across {materials.filter(m => getState(m.id).need > 0).length} materials
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setVaultMode(true)}
            className="px-3 py-1.5 text-xs border border-[#b8ff00]/40 text-[#b8ff00] rounded hover:bg-[#b8ff00]/10 transition-colors font-medium"
          >
            ⬡ Vault Mode
          </button>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideComplete}
              onChange={e => setHideComplete(e.target.checked)}
              className="accent-[#b8ff00]"
            />
            Hide complete
          </label>
          <div className="flex gap-1">
            {(['all', ...TIER_ORDER] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterTier(t)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  filterTier === t
                    ? t === 'all'
                      ? 'bg-white/10 border-white/20 text-white'
                      : `${TIER_BG[t as Tier]} border-current ${TIER_COLORS[t as Tier]}`
                    : 'border-gray-700 text-gray-500 hover:border-gray-500'
                }`}
              >
                {t === 'all' ? 'All' : TIER_LABELS[t as Tier]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium w-[40%]">Material</th>
              <th className="text-center px-3 py-3 text-xs text-gray-500 font-medium w-[15%]">Need</th>
              <th className="text-center px-3 py-3 text-xs text-gray-500 font-medium w-[25%]">Have</th>
              <th className="text-center px-3 py-3 text-xs text-gray-500 font-medium w-[15%]">Left</th>
            </tr>
          </thead>
          <tbody>
            {TIER_ORDER.map(tier => {
              const tierMats = filtered.filter(m => m.tier === tier)
              if (tierMats.length === 0) return null
              return [
                <tr key={`header-${tier}`} className="bg-gray-900/30">
                  <td colSpan={4} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${TIER_COLORS[tier]}`}>
                    {TIER_LABELS[tier]}
                  </td>
                </tr>,
                ...tierMats.map(m => {
                  const s = getState(m.id)
                  const remaining = Math.max(0, s.need - s.have)
                  const isComplete = s.need > 0 && s.have >= s.need
                  const isTracked = s.need > 0

                  return (
                    <tr
                      key={m.id}
                      className={`border-t border-gray-800/50 transition-colors ${isComplete ? 'opacity-40' : 'hover:bg-gray-900/30'}`}
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/materials/${m.id}`}
                            className="flex items-center gap-3 hover:text-[#b8ff00] transition-colors font-medium flex-1 min-w-0"
                          >
                            {m.image && (
                              <Image
                                src={m.image}
                                alt={m.name}
                                width={64}
                                height={64}
                                className="rounded shrink-0 object-contain bg-gray-800"
                              />
                            )}
                            <span>{m.name}</span>
                            {isComplete && (
                              <span className="text-xs text-green-500">✓</span>
                            )}
                          </Link>
                          <button
                            onClick={() => togglePin(m.id)}
                            disabled={!pins.includes(m.id) && pins.length >= MAX_PINS}
                            title={pins.includes(m.id) ? 'Unpin' : pins.length >= MAX_PINS ? 'Max 3 pins' : 'Pin — show others you\'re hunting this'}
                            className={`shrink-0 text-base transition-colors disabled:opacity-20 ${
                              pins.includes(m.id)
                                ? 'text-[#b8ff00]'
                                : 'text-gray-700 hover:text-gray-400'
                            }`}
                          >
                            📍
                          </button>
                        </div>
                      </td>

                      {/* Need */}
                      <td className="px-3 py-3 text-center">
                        {editingNeed === m.id ? (
                          <input
                            type="number"
                            min={0}
                            defaultValue={s.need}
                            className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-center text-white focus:outline-none focus:border-[#b8ff00]"
                            autoFocus
                            onBlur={e => {
                              setNeed(m.id, parseInt(e.target.value) || 0)
                              setEditingNeed(null)
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                setNeed(m.id, parseInt((e.target as HTMLInputElement).value) || 0)
                                setEditingNeed(null)
                              }
                              if (e.key === 'Escape') setEditingNeed(null)
                            }}
                          />
                        ) : (
                          <button
                            onClick={() => setEditingNeed(m.id)}
                            className={`w-14 rounded px-2 py-0.5 border transition-colors ${
                              isTracked
                                ? 'border-gray-600 text-white hover:border-gray-400'
                                : 'border-dashed border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'
                            }`}
                          >
                            {s.need || '—'}
                          </button>
                        )}
                      </td>

                      {/* Have */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => adjustHave(m.id, -1)}
                            className="w-7 h-7 rounded border border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-400 transition-colors flex items-center justify-center"
                          >
                            −
                          </button>
                          {editingHave === m.id ? (
                            <input
                              type="number"
                              min={0}
                              defaultValue={s.have}
                              className="w-12 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-center text-white focus:outline-none focus:border-[#b8ff00]"
                              autoFocus
                              onBlur={e => {
                                setHave(m.id, parseInt(e.target.value) || 0)
                                setEditingHave(null)
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  setHave(m.id, parseInt((e.target as HTMLInputElement).value) || 0)
                                  setEditingHave(null)
                                }
                                if (e.key === 'Escape') setEditingHave(null)
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingHave(m.id)}
                              className="w-12 text-center rounded border border-gray-700 text-white hover:border-gray-400 px-2 py-0.5 transition-colors"
                            >
                              {s.have}
                            </button>
                          )}
                          <button
                            onClick={() => adjustHave(m.id, 1)}
                            className="w-7 h-7 rounded border border-gray-700 text-gray-400 hover:border-[#b8ff00] hover:text-[#b8ff00] transition-colors flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Remaining */}
                      <td className="px-3 py-3 text-center">
                        {isTracked ? (
                          <span className={`font-bold ${isComplete ? 'text-green-500' : remaining > 0 ? 'text-white' : 'text-green-500'}`}>
                            {isComplete ? '✓' : remaining}
                          </span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    </tr>
                  )
                }),
              ]
            })}
          </tbody>
        </table>
      </div>
      </>}
    </div>
  )
}
