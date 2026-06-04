'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { factions } from '@/lib/factions'
import { getMaterialById, materials } from '@/lib/materials'
import { useTracker, getSavedUser } from '@/lib/store'

const FACTION_PRIORITY = ['cyberacme', 'nucaloric', 'traxus', 'mida', 'arachne', 'sekiguchi']

// Batch edit modal for all faction materials
function FactionEditModal({ faction, editValues, onValueChange, onSave, onCancel }: {
  faction: typeof factions[0]
  editValues: Record<string, string>
  onValueChange: (materialId: string, value: string) => void
  onSave: (totals: Record<string, number>) => void
  onCancel: () => void
}) {
  // Track individual number lists per material
  const [numberLists, setNumberLists] = useState<Record<string, number[]>>({})

  // Initialize on first mount only
  useEffect(() => {
    if (Object.keys(numberLists).length === 0) {
      const init: Record<string, number[]> = {}
      faction.materials.forEach(({ materialId, need }) => {
        init[materialId] = [need]
      })
      setNumberLists(init)
    }
  }, [faction.id])

  function updateNumber(materialId: string, index: number, value: string) {
    const nums = [...(numberLists[materialId] || [])]
    const parsed = parseInt(value) || 0
    nums[index] = parsed
    setNumberLists({ ...numberLists, [materialId]: nums })
  }

  function addNumber(materialId: string) {
    const nums = [...(numberLists[materialId] || [])]
    nums.push(0)
    setNumberLists({ ...numberLists, [materialId]: nums })
  }

  function removeNumber(materialId: string, index: number) {
    const nums = [...(numberLists[materialId] || [])]
    nums.splice(index, 1)
    setNumberLists({ ...numberLists, [materialId]: nums })
  }

  function getTotal(materialId: string): number {
    return (numberLists[materialId] || []).reduce((sum, n) => sum + n, 0)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1117] border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-bold text-lg">{faction.name} — Edit all requirements</h3>
          <p className="text-xs text-gray-500 mt-1">Type amounts — new boxes appear as you fill them</p>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3">
          <div className="space-y-4">
            {faction.materials.map(({ materialId }) => {
              const mat = materials.find(m => m.id === materialId)
              if (!mat) return null
              const nums = numberLists[materialId] || []
              const total = getTotal(materialId)

              return (
                <div key={materialId}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {mat.image && (
                        <Image src={mat.image} alt={mat.name} width={24} height={24}
                          className="rounded shrink-0 object-contain" />
                      )}
                      <label className="text-xs text-gray-400 font-medium truncate">{mat.name}</label>
                    </div>
                    <div className="text-sm font-bold text-[#b8ff00] shrink-0 ml-2">Total: {total}</div>
                  </div>
                  <div className="space-y-1.5">
                    {nums.map((n, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="number"
                          value={n || ''}
                          onChange={e => updateNumber(materialId, idx, e.target.value)}
                          autoFocus={idx === nums.length - 1 && n === 0}
                          placeholder="0"
                          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#b8ff00]"
                        />
                        {nums.length > 1 && (
                          <button
                            onClick={() => removeNumber(materialId, idx)}
                            className="text-gray-600 hover:text-red-400 text-lg leading-none w-6"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {nums.length === 0 || (nums.length > 0 && nums[nums.length - 1] > 0) ? (
                      <button
                        onClick={() => addNumber(materialId)}
                        className="w-full text-xs py-1.5 border border-gray-700 text-gray-500 rounded hover:border-gray-500 hover:text-gray-300 transition-colors"
                      >
                        + Add another
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-800 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-700 text-gray-400 rounded hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const totals: Record<string, number> = {}
              faction.materials.forEach(({ materialId }) => {
                totals[materialId] = getTotal(materialId)
              })
              onSave(totals)
            }}
            className="px-4 py-2 text-sm bg-[#b8ff00] text-black font-bold rounded hover:bg-[#a3e600] transition-colors"
          >
            Save all
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [editingFaction, setEditingFaction] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const u = getSavedUser()
    if (u) {
      setUserId(u.id)
      setActiveFactions(loadActive(u.id))
    }
  }, [])

  const { getState, setNeed, loading } = useTracker(userId)

  // Detect pre-existing users: they have needs stored but no active factions tracked
  const hasStoredNeeds = !loading && factions.some(f =>
    f.materials.some(({ materialId }) => getState(materialId).need > 0)
  )
  const needsMigration = !loading && hasStoredNeeds && activeFactions.size === 0

  /** Full recalculate — only called when user explicitly resets a faction */
  function recomputeNeeds(nextActive: Set<string>) {
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

  /** Just toggle active state — never touches stored needs */
  function toggleFaction(factionId: string) {
    const isActive = activeFactions.has(factionId)
    const next = new Set(activeFactions)
    if (isActive) next.delete(factionId)
    else next.add(factionId)
    setActiveFactions(next)
    if (userId) saveActive(userId, next)
    setConfirmed(null)
  }

  /** Reset a faction's needs back to original totals (destructive) */
  function resetFactionNeeds(factionId: string) {
    const next = new Set(activeFactions).add(factionId)
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
      if (!higherFaction) continue
      // Waterfall always applies regardless of active state —
      // higher-priority factions always get first claim on the stash
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">Factions</h1>
          <p className="text-xs text-gray-500 mt-1">
            Active factions sum their needs on the tracker · shared materials flow top to bottom
          </p>
        </div>
        {userId && !loading && activeFactions.size > 0 && (
          <button
            onClick={() => {
              if (!confirm('This will set your tracker needs to the combined total of all active factions. Your have counts won\'t change. Continue?')) return
              recomputeNeeds(activeFactions)
            }}
            className="shrink-0 px-3 py-1.5 text-xs border border-[#b8ff00]/40 text-[#b8ff00] rounded hover:bg-[#b8ff00]/10 transition-colors"
          >
            ↻ Sync tracker totals
          </button>
        )}
      </div>

      {!userId && (
        <div className="text-gray-500 text-sm mb-6">
          <Link href="/" className="text-[#b8ff00] hover:underline">Sign in on the tracker</Link> to save your goals.
        </div>
      )}

      {needsMigration && (
        <div className="border border-yellow-600/40 bg-yellow-600/10 rounded-lg px-5 py-4 mb-6">
          <div className="text-yellow-400 text-sm font-medium mb-1">⚠ Action needed</div>
          <p className="text-gray-300 text-xs leading-relaxed">
            You have existing goals set but no factions are marked active yet. Click{' '}
            <strong className="text-white">Set goals</strong> on each faction you're working on and choose{' '}
            <strong className="text-white">Activate</strong>, then hit{' '}
            <strong className="text-[#b8ff00]">↻ Sync tracker totals</strong> to fix the combined need numbers.
          </p>
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
                    <div className="flex flex-col items-end gap-1.5">
                      {confirmed?.action === 'add' ? (
                        <>
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmed(null)}
                              className="text-xs border border-gray-600 text-gray-400 rounded px-2 py-1 hover:border-gray-400 transition-colors">
                              Cancel
                            </button>
                            <button onClick={() => toggleFaction(faction.id)}
                              className="text-xs bg-[#b8ff00] text-black font-bold rounded px-2 py-1 hover:bg-[#a3e600] transition-colors">
                              Activate (keep progress)
                            </button>
                          </div>
                          <button onClick={() => resetFactionNeeds(faction.id)}
                            className="text-xs border border-red-800 text-red-400 rounded px-2 py-1 hover:border-red-600 transition-colors">
                            Reset to original totals
                          </button>
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmed(null)}
                            className="text-xs border border-gray-600 text-gray-400 rounded px-2 py-1 hover:border-gray-400 transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => toggleFaction(faction.id)}
                            className="text-xs bg-red-600 text-white font-bold rounded px-2 py-1 hover:bg-red-700 transition-colors">
                            Deactivate
                          </button>
                        </div>
                      )}
                    </div>
                  ) : isActive ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingFaction(faction.id)
                          const vals: Record<string, string> = {}
                          faction.materials.forEach(({ materialId, need }) => {
                            vals[materialId] = String(need)
                          })
                          setEditValues(vals)
                        }}
                        className="text-xs border border-gray-700 text-gray-500 rounded px-3 py-1.5 hover:border-[#b8ff00] hover:text-[#b8ff00] transition-colors"
                      >
                        ✎ Edit all
                      </button>
                      <button
                        onClick={() => setConfirmed({ id: faction.id, action: 'remove' })}
                        className="text-xs border border-gray-700 text-gray-500 rounded px-3 py-1.5 hover:border-red-600 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
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
                      <div
                        key={materialId}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors ${
                          complete ? 'border-gray-800 opacity-40 hover:border-gray-700'
                          : 'border-gray-700/50 hover:border-gray-600'
                        }`}
                      >
                        <Link
                          href={`/materials/${materialId}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          {mat.image && (
                            <Image src={mat.image} alt={mat.name} width={48} height={48}
                              className="rounded shrink-0 object-contain" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-xs font-medium truncate">{mat.name}</div>
                            <div className="text-xs mt-0.5 text-gray-500">
                              {remaining === 0 ? (
                                <span className="text-green-400">✓ Need 0 more</span>
                              ) : (
                                <>
                                  <span className="text-white font-medium">{remaining} needed</span>
                                  {' · '}have {effectiveHave} usable
                                </>
                              )}
                              {isShared && (
                                <div className="text-xs text-yellow-600 mt-0.5">
                                  {rawHave - effectiveHave} held for higher priority
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>

                        <div className={`text-sm font-bold shrink-0 ${complete ? 'text-green-400' : 'text-white'}`}>
                          {complete ? '✓' : need}
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

      {/* Batch edit modal */}
      {editingFaction && (
        <FactionEditModal
          faction={factions.find(f => f.id === editingFaction)!}
          editValues={editValues}
          onValueChange={(materialId, value) => setEditValues({ ...editValues, [materialId]: value })}
          onSave={(totals) => {
            console.log('Saving totals:', totals)
            Object.entries(totals).forEach(([materialId, total]) => {
              console.log(`Setting ${materialId} need to ${total}`)
              setNeed(materialId, total)
            })
            setEditingFaction(null)
            setEditValues({})
          }}
          onCancel={() => {
            setEditingFaction(null)
            setEditValues({})
          }}
        />
      )}
    </div>
  )
}
