'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { factions } from '@/lib/factions'
import { getMaterialById, TIER_ORDER, TIER_COLORS, TIER_BG, type Tier } from '@/lib/materials'
import { useTracker, getSavedUser } from '@/lib/store'
import { getUserPins } from '@/lib/supabase'

const FACTION_PRIORITY = ['cyberacme', 'nucaloric', 'traxus', 'mida', 'arachne', 'sekiguchi']

const TIER_BORDER_COLORS: Record<Tier, string> = {
  prestige: '#facc15',
  superior: '#a855f7',
  deluxe: '#60a5fa',
  enhanced: '#4ade80',
  standard: '#d1d5db',
}

// Edit modal with progressive number boxes
function FactionEditModal({
  faction,
  getState,
  setNeed,
  onClose,
}: {
  faction: typeof factions[0]
  getState: (id: string) => { need: number; have: number }
  setNeed: (id: string, need: number) => void
  onClose: () => void
}) {
  const [numberLists, setNumberLists] = useState<Record<string, number[]>>({})

  // Initialize from tracker state
  useEffect(() => {
    const init: Record<string, number[]> = {}
    faction.materials.forEach(({ materialId }) => {
      const trackerNeed = getState(materialId).need
      init[materialId] = trackerNeed > 0 ? [trackerNeed] : [0]
    })
    setNumberLists(init)
  }, [faction.id, getState])

  function updateNumber(materialId: string, index: number, value: string) {
    const nums = [...(numberLists[materialId] || [])]
    nums[index] = parseInt(value) || 0
    setNumberLists({ ...numberLists, [materialId]: nums })
  }

  function getTotal(materialId: string): number {
    return (numberLists[materialId] || []).reduce((sum, n) => sum + n, 0)
  }

  function handleSave() {
    Object.entries(numberLists).forEach(([materialId, nums]) => {
      const total = nums.reduce((sum, n) => sum + n, 0)
      setNeed(materialId, total)
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1117] border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-bold text-lg">{faction.name} — Edit requirements</h3>
          <p className="text-xs text-gray-500 mt-1">Enter numbers — boxes appear as you fill them</p>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3">
          <div className="space-y-4">
            {faction.materials.map(({ materialId }) => {
              const mat = getMaterialById(materialId)
              if (!mat) return null
              const nums = numberLists[materialId] || [0]
              const total = getTotal(materialId)

              return (
                <div key={materialId}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {mat.image && (
                        <Image
                          src={mat.image}
                          alt={mat.name}
                          width={24}
                          height={24}
                          className="rounded shrink-0 object-contain"
                          style={{ border: `2px solid ${TIER_BORDER_COLORS[mat.tier]}` }}
                        />
                      )}
                      <label className="text-xs text-gray-400 font-medium truncate">{mat.name}</label>
                    </div>
                    <div className="text-sm font-bold text-[#b8ff00] shrink-0 ml-2">Total: {total}</div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {nums.map((n, idx) => (
                      <input
                        key={idx}
                        type="number"
                        min={0}
                        value={n || ''}
                        onChange={e => updateNumber(materialId, idx, e.target.value)}
                        onBlur={e => {
                          // Auto-add next box if this one has a value and isn't the last
                          if (parseInt(e.target.value) > 0 && idx === nums.length - 1) {
                            setNumberLists({ ...numberLists, [materialId]: [...nums, 0] })
                          }
                        }}
                        placeholder="0"
                        className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#b8ff00]"
                      />
                    ))}
                    {nums.length === 0 && (
                      <input
                        type="number"
                        min={0}
                        value=""
                        placeholder="0"
                        onChange={e => {
                          if (e.target.value) {
                            setNumberLists({ ...numberLists, [materialId]: [parseInt(e.target.value) || 0] })
                          }
                        }}
                        className="w-16 bg-gray-700/30 border border-gray-700 rounded px-2 py-1.5 text-gray-600 text-sm focus:outline-none focus:border-[#b8ff00] focus:text-white"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-800 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-700 text-gray-400 rounded hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-[#b8ff00] text-black font-bold rounded hover:bg-[#a3e600] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function activeKey(userId: string) {
  return `marathon-active-factions-${userId}`
}

function loadActive(userId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(activeKey(userId)) || '[]'))
  } catch {
    return new Set()
  }
}

function saveActive(userId: string, active: Set<string>) {
  localStorage.setItem(activeKey(userId), JSON.stringify([...active]))
}

export default function FactionsClient() {
  const [userId, setUserId] = useState<string | null>(null)
  const [activeFactions, setActiveFactions] = useState<Set<string>>(new Set())
  const [editingFactionId, setEditingFactionId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<string | null>(null)
  const [showTotals, setShowTotals] = useState(false)
  const [visibleTiers, setVisibleTiers] = useState<Set<Tier>>(new Set(TIER_ORDER))
  const [superTracking, setSuperTracking] = useState(false)
  const [pins, setPins] = useState<string[]>([])

  // Load tier visibility preference
  useEffect(() => {
    const saved = localStorage.getItem('marathon-visible-tiers')
    if (saved) {
      try {
        const tiers = JSON.parse(saved) as Tier[]
        setVisibleTiers(new Set(tiers))
      } catch {
        // If parsing fails, keep default (all tiers visible)
      }
    }
  }, [])

  // Save tier visibility preference
  useEffect(() => {
    localStorage.setItem('marathon-visible-tiers', JSON.stringify(Array.from(visibleTiers)))
  }, [visibleTiers])

  useEffect(() => {
    const u = getSavedUser()
    if (u) {
      setUserId(u.id)
      setActiveFactions(loadActive(u.id))
      getUserPins(u.id).then(setPins).catch(() => {})
    }
  }, [])

  const { getState, setNeed, loading } = useTracker(userId)

  function toggleFaction(factionId: string) {
    const isActive = activeFactions.has(factionId)
    const next = new Set(activeFactions)
    if (isActive) next.delete(factionId)
    else next.add(factionId)
    setActiveFactions(next)
    if (userId) saveActive(userId, next)
    setConfirmed(null)
  }

  function getEffectiveHave(materialId: string, factionId: string): number {
    const totalHave = getState(materialId).have
    const myIndex = FACTION_PRIORITY.indexOf(factionId)
    let remaining = totalHave
    for (let i = 0; i < myIndex; i++) {
      const higherFaction = factions.find(f => f.id === FACTION_PRIORITY[i])
      if (!higherFaction) continue
      const theirNeed = higherFaction.materials.find(m => m.materialId === materialId)?.need ?? 0
      remaining -= Math.min(remaining, theirNeed)
      if (remaining <= 0) return 0
    }
    return remaining
  }

  function getTotalRemaining(factionId: string): number {
    const faction = factions.find(f => f.id === factionId)
    if (!faction) return 0
    return faction.materials.reduce((sum, { materialId }) => {
      const trackerNeed = getState(materialId).need
      return sum + Math.max(0, trackerNeed - getEffectiveHave(materialId, factionId))
    }, 0)
  }

  function getProgress(factionId: string): { done: number; total: number } {
    const faction = factions.find(f => f.id === factionId)
    if (!faction) return { done: 0, total: 0 }
    const total = faction.materials.length
    const done = faction.materials.filter(({ materialId }) => {
      const trackerNeed = getState(materialId).need
      return getEffectiveHave(materialId, factionId) >= trackerNeed
    }).length
    return { done, total }
  }

  // Get per-material totals across active factions, grouped by tier
  function getMaterialTotalsByTier() {
    const allMaterialIds = new Set<string>()
    activeFactions.forEach(factionId => {
      const faction = factions.find(f => f.id === factionId)
      if (faction) {
        faction.materials.forEach(({ materialId }) => {
          allMaterialIds.add(materialId)
        })
      }
    })

    console.log('Active factions:', Array.from(activeFactions))
    console.log('All material IDs found:', Array.from(allMaterialIds).map(id => ({ id, tier: getMaterialById(id)?.tier })))

    const materials = Array.from(allMaterialIds)
      .map(materialId => {
        const state = getState(materialId)
        const mat = getMaterialById(materialId)
        return {
          material: mat,
          materialId,
          need: state.need,
          have: state.have,
          remaining: Math.max(0, state.need - state.have),
        }
      })
      .filter(m => m.material)

    // Group by tier
    const byTier: Record<Tier, typeof materials> = {
      prestige: [],
      superior: [],
      deluxe: [],
      enhanced: [],
      standard: [],
    }

    materials.forEach(m => {
      if (m.material) {
        byTier[m.material.tier].push(m)
      }
    })

    // Sort within each tier by remaining
    Object.keys(byTier).forEach(tier => {
      byTier[tier as Tier].sort((a, b) => (b.remaining || 0) - (a.remaining || 0))
    })

    return byTier
  }

  const materialsByTier = getMaterialTotalsByTier()

  function toggleTierVisibility(tier: Tier) {
    const next = new Set(visibleTiers)
    if (next.has(tier)) next.delete(tier)
    else next.add(tier)
    setVisibleTiers(next)
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">Factions</h1>
          <p className="text-xs text-gray-500 mt-1">
            Set your NEED numbers here. Compare against HAVE in Vault.
          </p>
        </div>
        {userId && activeFactions.size > 0 && (
          <button
            onClick={() => setShowTotals(!showTotals)}
            className="text-xs border border-gray-700 text-gray-400 rounded px-3 py-1.5 hover:border-[#b8ff00] hover:text-[#b8ff00] transition-colors shrink-0"
          >
            {showTotals ? '▼' : '▶'} Totals
          </button>
        )}
      </div>

      {showTotals && (
        <div className="mb-6 border border-gray-700 rounded-lg overflow-hidden bg-gray-900/30">
          {/* Tier filters */}
          <div className="border-b border-gray-800 px-4 py-3 flex flex-wrap gap-2">
            {TIER_ORDER.map(tier => (
              <button
                key={tier}
                onClick={() => toggleTierVisibility(tier)}
                className={`text-xs px-3 py-1 rounded border transition-colors ${
                  visibleTiers.has(tier)
                    ? `${TIER_BG[tier]} ${TIER_COLORS[tier]} border-current`
                    : 'border-gray-700 text-gray-600 hover:border-gray-500'
                }`}
              >
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </button>
            ))}
          </div>

          {/* Super tracking checkbox */}
          <div className="border-b border-gray-800 px-4 py-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={superTracking}
              onChange={e => setSuperTracking(e.target.checked)}
              className="accent-[#b8ff00]"
              id="super-tracking"
            />
            <label htmlFor="super-tracking" className="text-xs text-gray-300 cursor-pointer">
              Show my Super Tracking ({pins.length}/3)
            </label>
          </div>

          {/* Super tracking items */}
          {superTracking && pins.length > 0 && (
            <div className="border-b border-gray-800 px-4 py-3 bg-gray-800/20">
              <div className="text-xs text-gray-500 mb-2 font-medium">You're hunting:</div>
              <div className="flex gap-2 flex-wrap">
                {pins.map(materialId => {
                  const mat = getMaterialById(materialId)
                  if (!mat) return null
                  return (
                    <div key={materialId} className="flex items-center gap-2 px-2 py-1 rounded bg-gray-700/50 border border-gray-600">
                      {mat.image && (
                        <Image
                          src={mat.image}
                          alt={mat.name}
                          width={24}
                          height={24}
                          className="rounded object-contain"
                        />
                      )}
                      <span className="text-xs text-gray-300">{mat.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Materials by tier */}
          <div className="p-4 space-y-4">
            {TIER_ORDER.map(tier => {
              if (!visibleTiers.has(tier)) return null
              const materials = materialsByTier[tier]
              if (!materials || materials.length === 0) return null

              return (
                <div key={tier}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${TIER_COLORS[tier]}`}>
                    {tier}
                  </h4>
                  <div className="space-y-2">
                    {materials.map(({ materialId, material, need, have, remaining }) => (
                      <div
                        key={materialId}
                        className="flex items-center gap-3 rounded px-3 py-2 border border-gray-800/50 hover:border-gray-700"
                      >
                        {material?.image && (
                          <Image
                            src={material.image}
                            alt={material.name}
                            width={48}
                            height={48}
                            className="rounded shrink-0 object-contain"
                            style={{ border: `3px solid ${TIER_BORDER_COLORS[material.tier]}` }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{material?.name}</div>
                        </div>
                        <div className="flex gap-4 text-xs shrink-0">
                          <div className="text-center">
                            <div className="text-gray-500 text-xs">Need</div>
                            <div className="font-bold text-white">{need}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500 text-xs">Have</div>
                            <div className="font-bold text-[#b8ff00]">{have}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500 text-xs">Remaining</div>
                            <div className={`font-bold ${remaining === 0 ? 'text-green-400' : 'text-white'}`}>
                              {remaining}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!userId && (
        <div className="text-gray-500 text-sm mb-6">
          <Link href="/" className="text-[#b8ff00] hover:underline">Sign in on the vault</Link> to save your goals.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {factions.map(faction => {
          const isActive = activeFactions.has(faction.id)
          const { done, total } = getProgress(faction.id)
          const totalRemaining = getTotalRemaining(faction.id)
          const isConfirming = confirmed === faction.id
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
                      <button
                        onClick={() => setConfirmed(null)}
                        className="text-xs border border-gray-600 text-gray-400 rounded px-2 py-1 hover:border-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => toggleFaction(faction.id)}
                        className={`text-xs font-bold rounded px-2 py-1 transition-colors ${
                          isActive
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-[#b8ff00] text-black hover:bg-[#a3e600]'
                        }`}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {isActive && (
                        <button
                          onClick={() => setEditingFactionId(faction.id)}
                          className="text-xs border border-gray-700 text-gray-500 rounded px-3 py-1.5 hover:border-[#b8ff00] hover:text-[#b8ff00] transition-colors"
                        >
                          ✎ Edit
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmed(faction.id)}
                        className={`text-xs rounded px-3 py-1.5 border font-medium transition-colors ${
                          isActive
                            ? 'border-gray-600 text-gray-400 hover:border-gray-500'
                            : `${faction.borderColor} ${faction.color} hover:opacity-80`
                        }`}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  )
                ) : null}
              </div>

              {/* Progress bar — only if active */}
              {isActive && !faction.tbc && userId && !loading && total > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{done}/{total} complete</span>
                    <span>{totalRemaining} needed</span>
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
                  {faction.materials.map(({ materialId }) => {
                    const mat = getMaterialById(materialId)
                    if (!mat) return null
                    const trackerNeed = getState(materialId).need
                    const effectiveHave = getEffectiveHave(materialId, faction.id)
                    const rawHave = getState(materialId).have
                    const remaining = Math.max(0, trackerNeed - effectiveHave)
                    const complete = effectiveHave >= trackerNeed
                    const isShared = rawHave !== effectiveHave

                    return (
                      <div
                        key={materialId}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors ${
                          complete ? 'border-gray-800 opacity-40 hover:border-gray-700' : 'border-gray-700/50 hover:border-gray-600'
                        }`}
                      >
                        <Link
                          href={`/materials/${materialId}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div className="relative shrink-0">
                            {mat.image && (
                              <Image
                                src={mat.image}
                                alt={mat.name}
                                width={48}
                                height={48}
                                className="rounded object-contain"
                                style={{ border: `3px solid ${TIER_BORDER_COLORS[mat.tier]}` }}
                              />
                            )}
                            {effectiveHave > 0 && (
                              <div className="absolute bottom-0 right-0 bg-black/80 px-1.5 py-0.5 text-white text-xs font-bold rounded-sm z-10">
                                ×{effectiveHave}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-xs font-medium truncate">{mat.name}</div>
                            <div className="text-xs mt-0.5 text-gray-500">
                              {trackerNeed === 0 ? (
                                <span className="text-green-400">✓ Done</span>
                              ) : effectiveHave >= trackerNeed ? (
                                <span className="text-[#b8ff00]">Ready</span>
                              ) : (
                                <span className="text-white font-medium">{trackerNeed} needed</span>
                              )}
                              {isShared && (
                                <div className="text-xs text-yellow-600 mt-0.5">
                                  {rawHave - effectiveHave} held for higher
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>

                        <div className="flex flex-col items-end shrink-0 gap-0.5">
                          <div className="text-xs text-gray-500">Remaining</div>
                          <div className={`text-sm font-bold ${trackerNeed === 0 ? 'text-green-400' : effectiveHave >= trackerNeed ? 'text-[#b8ff00]' : 'text-white'}`}>
                            {trackerNeed === 0 ? '✓' : Math.max(-999, trackerNeed - rawHave)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
      {editingFactionId && (
        <FactionEditModal
          faction={factions.find(f => f.id === editingFactionId)!}
          getState={getState}
          setNeed={setNeed}
          onClose={() => setEditingFactionId(null)}
        />
      )}
    </div>
  )
}
