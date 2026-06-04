'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { factions } from '@/lib/factions'
import { getMaterialById } from '@/lib/materials'
import { useTracker, getSavedUser } from '@/lib/store'

const FACTION_PRIORITY = ['cyberacme', 'nucaloric', 'traxus', 'mida', 'arachne', 'sekiguchi']

// Simple edit modal
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
  const [values, setValues] = useState<Record<string, number>>({})

  // Initialize from tracker state
  useEffect(() => {
    const init: Record<string, number> = {}
    faction.materials.forEach(({ materialId }) => {
      init[materialId] = getState(materialId).need
    })
    setValues(init)
  }, [faction.id, getState])

  function handleSave() {
    Object.entries(values).forEach(([materialId, need]) => {
      setNeed(materialId, need)
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1117] border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-bold text-lg">{faction.name} — Edit requirements</h3>
          <p className="text-xs text-gray-500 mt-1">Enter how many of each material you need</p>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3">
          <div className="space-y-3">
            {faction.materials.map(({ materialId }) => {
              const mat = getMaterialById(materialId)
              if (!mat) return null
              const need = values[materialId] ?? 0

              return (
                <div key={materialId} className="flex items-center gap-3">
                  {mat.image && (
                    <Image
                      src={mat.image}
                      alt={mat.name}
                      width={32}
                      height={32}
                      className="rounded shrink-0 object-contain"
                    />
                  )}
                  <label className="text-xs text-gray-300 font-medium flex-1 min-w-0">
                    {mat.name}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={need}
                    onChange={e => setValues({ ...values, [materialId]: parseInt(e.target.value) || 0 })}
                    className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#b8ff00]"
                  />
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

  useEffect(() => {
    const u = getSavedUser()
    if (u) {
      setUserId(u.id)
      setActiveFactions(loadActive(u.id))
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white tracking-wide">Factions</h1>
        <p className="text-xs text-gray-500 mt-1">
          Set your NEED numbers here. Compare against HAVE in Vault.
        </p>
      </div>

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
                          {mat.image && (
                            <Image
                              src={mat.image}
                              alt={mat.name}
                              width={48}
                              height={48}
                              className="rounded shrink-0 object-contain"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-xs font-medium truncate">{mat.name}</div>
                            <div className="text-xs mt-0.5 text-gray-500">
                              {remaining === 0 ? (
                                <span className="text-green-400">✓ Done</span>
                              ) : (
                                <>
                                  <span className="text-white font-medium">{remaining} needed</span>
                                  {' · '}have {effectiveHave} usable
                                </>
                              )}
                              {isShared && (
                                <div className="text-xs text-yellow-600 mt-0.5">
                                  {rawHave - effectiveHave} held for higher
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>

                        <div className={`text-sm font-bold shrink-0 ${complete ? 'text-green-400' : 'text-white'}`}>
                          {complete ? '✓' : trackerNeed}
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
