'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { factions } from '@/lib/factions'
import { getMaterialById, materials } from '@/lib/materials'
import { useTracker, getSavedUser } from '@/lib/store'

const FACTION_PRIORITY = ['cyberacme', 'nucaloric', 'traxus', 'mida', 'arachne', 'sekiguchi']

function activeKey(userId: string) { return `marathon-active-factions-${userId}` }

function loadActive(userId: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(activeKey(userId)) || '[]')) }
  catch { return new Set() }
}

function saveActive(userId: string, active: Set<string>) {
  localStorage.setItem(activeKey(userId), JSON.stringify([...active]))
}

export default function FactionsClient() {
  const [userId, setUserId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<{ id: string; action: 'add' | 'remove' } | null>(null)
  const [activeFactions, setActiveFactions] = useState<Set<string>>(new Set())

  useEffect(() => {
    const u = getSavedUser()
    if (u) {
      setUserId(u.id)
      setActiveFactions(loadActive(u.id))
    }
  }, [])

  const { getState, setNeed, loading } = useTracker(userId)

  /** Recompute all material needs as sum of active factions */
  function recomputeNeeds(nextActive: Set<string>) {
    // Get every material that appears in any faction
    const allMaterialIds = new Set(
      factions.flatMap(f => f.materials.map(m => m.materialId))
    )
    for (const materialId of allMaterialIds) {
      const total = factions
        .filter(f => nextActive.has(f.id))
        .reduce((sum, f) => {
          const entry = f.materials.find(m => m.materialId === materialId)
          return sum + (entry?.need ?? 0)
        }, 0)
      setNeed(materialId, total)
    }
  }

  function toggleFaction(factionId: string) {
    const isActive = activeFactions.has(factionId)
    const next = new Set(activeFactions)
    if (isActive) next.delete(factionId)
    else next.add(factionId)

    setActiveFactions(next)
    if (userId) saveActive(userId, next)
    recomputeNeeds(next)
    setConfirmed(null)
  }

  function getEffectiveHave(materialId: string, factionId: string): number {
    const totalHave = getState(materialId).have
    const myIndex = FACTION_PRIORITY.indexOf(factionId)
    let remaining = totalHave
    for (let i = 0; i < myIndex; i++) {
      const higherFaction = factions.find(f => f.id === FACTION_PRIORITY[i])
      if (!higherFaction || !activeFactions.has(higherFaction.id)) continue
      const theirNeed = higherFaction.materials.find(m => m.materialId === materialId)?.need ?? 0
      remaining -= Math.min(remaining, theirNeed)
      if (remaining <= 0) return 0
    }
    return remaining
  }

  function getTotalRemaining(factionId: string): number {
    const faction = factions.find(f => f.id === factionId)
    if (!faction) return 0
    return faction.materials.reduce((sum, { materialId, need }) => {
      return sum + Math.max(0, need - getEffectiveHave(materialId, factionId))
    }, 0)
  }

  function getProgress(factionId: string): { done: number; total: number } {
    const faction = factions.find(f => f.id === factionId)
    if (!faction) return { done: 0, total: 0 }
    const total = faction.materials.length
    const done = faction.materials.filter(({ materialId, need }) =>
      getEffectiveHave(materialId, factionId) >= need
    ).length
    return { done, total }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white tracking-wide">Factions</h1>
        <p className="text-xs text-gray-500 mt-1">
          Active factions sum their needs on the tracker · shared materials flow top to bottom
        </p>
      </div>

      {!userId && (
        <div className="text-gray-500 text-sm mb-6">
          <Link href="/" className="text-[#b8ff00] hover:underline">Sign in on the tracker</Link> to save your goals.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {factions.map(faction => {
          const isActive = activeFactions.has(faction.id)
          const { done, total } = getProgress(faction.id)
          const totalRemaining = getTotalRemaining(faction.id)
          const isConfirming = confirmed?.id === faction.id
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <div
              key={faction.id}
              className={`border rounded-xl p-5 transition-opacity ${faction.bgColor} ${
                isActive ? 'border-gray-600' : 'border-gray-800 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-lg font-bold tracking-wide ${faction.color}`}>
                      {faction.name}
                    </h2>
                    {isActive && (
                      <span className="text-xs bg-gray-700 text-gray-300 rounded px-1.5 py-0.5">Active</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Priority #{FACTION_PRIORITY.indexOf(faction.id) + 1}
                  </div>
                </div>

                {faction.tbc ? (
                  <span className="text-xs text-gray-600 border border-gray-700 rounded px-2 py-0.5">TBC</span>
                ) : userId ? (
                  isConfirming ? (
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmed(null)}
                        className="text-xs border border-gray-600 text-gray-400 rounded px-3 py-1 hover:border-gray-400 transition-colors">
                        Cancel
                      </button>
                      <button onClick={() => toggleFaction(faction.id)}
                        className={`text-xs font-bold rounded px-3 py-1 transition-colors ${
                          confirmed?.action === 'remove'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-[#b8ff00] text-black hover:bg-[#a3e600]'
                        }`}>
                        {confirmed?.action === 'remove' ? 'Remove' : 'Activate'}
                      </button>
                    </div>
                  ) : isActive ? (
                    <button
                      onClick={() => setConfirmed({ id: faction.id, action: 'remove' })}
                      className="text-xs border border-gray-700 text-gray-500 rounded px-3 py-1.5 hover:border-red-600 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmed({ id: faction.id, action: 'add' })}
                      className={`text-xs rounded px-3 py-1.5 border font-medium transition-colors ${faction.borderColor} ${faction.color} hover:opacity-80`}
                    >
                      Set goals
                    </button>
                  )
                ) : null}
              </div>

              {/* Progress bar — only if active */}
              {isActive && !faction.tbc && userId && !loading && total > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{done}/{total} materials complete</span>
                    <span>{totalRemaining} items still needed</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${faction.color.replace('text-', 'bg-')}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Material list */}
              {faction.tbc ? (
                <p className="text-gray-600 text-sm">Requirements not yet confirmed.</p>
              ) : (
                <div className="space-y-2">
                  {faction.materials.map(({ materialId, need }) => {
                    const mat = getMaterialById(materialId)
                    if (!mat) return null
                    const effectiveHave = getEffectiveHave(materialId, faction.id)
                    const rawHave = getState(materialId).have
                    const remaining = Math.max(0, need - effectiveHave)
                    const complete = effectiveHave >= need
                    const isShared = rawHave !== effectiveHave

                    return (
                      <Link
                        key={materialId}
                        href={`/materials/${materialId}`}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors hover:border-gray-600 ${
                          complete ? 'border-gray-800 opacity-40' : 'border-gray-700/50'
                        }`}
                      >
                        {mat.image && (
                          <Image src={mat.image} alt={mat.name} width={48} height={48}
                            className="rounded shrink-0 object-contain" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs font-medium truncate">{mat.name}</div>
                          <div className="text-xs mt-0.5">
                            {complete ? (
                              <span className="text-green-400">✓ Complete</span>
                            ) : (
                              <span className="text-gray-500">
                                <span className="text-white font-medium">{remaining} left</span>
                                {' · '}have {effectiveHave}
                                {isShared && isActive && (
                                  <span className="text-yellow-600"> ({rawHave} total)</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`text-sm font-bold shrink-0 ${complete ? 'text-green-400' : 'text-white'}`}>
                          {complete ? '✓' : remaining}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
