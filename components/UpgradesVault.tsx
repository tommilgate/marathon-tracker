'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { materials, type Tier } from '@/lib/materials'
import { useTracker } from '@/lib/store'
import { factions } from '@/lib/factions'
import { getAllLockedTierOrders } from '@/lib/supabase'

const ORDER_KEY = 'marathon-vault-order'
function loadVaultOrder(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]') } catch { return [] }
}

const TIER_BORDER_COLORS: Record<Tier, string> = {
  prestige: '#facc15',
  superior: '#a855f7',
  deluxe: '#60a5fa',
  enhanced: '#4ade80',
  standard: '#d1d5db',
}

const TIER_SPAN: Record<Tier, { col: number; row: number }> = {
  prestige: { col: 2, row: 2 },
  superior: { col: 2, row: 2 },
  deluxe:   { col: 2, row: 1 },
  enhanced: { col: 1, row: 1 },
  standard: { col: 1, row: 1 },
}

// Add aspect ratio style for items
const itemStyle = {
  aspectRatio: '1',
}

interface UpgradesVaultProps {
  userId: string | null
  selectedFaction: string | null
}

interface UndoEntry {
  materialId: string
  factionId: string
  quantity: number
}

interface SpendModalState {
  materialId: string
  factions: typeof factions
  selectedFactionId: string | null
  quantity: number
}

export default function UpgradesVault({ userId, selectedFaction }: UpgradesVaultProps) {
  const { getState, spend, setNeed } = useTracker(userId)
  const [flash, setFlash] = useState<Record<string, 'success' | 'warn'>>({})
  const [vaultOrder, setVaultOrder] = useState<string[]>([])
  const [scale, setScale] = useState(1)
  const [spendModal, setSpendModal] = useState<SpendModalState | null>(null)
  const [activeFactions, setActiveFactions] = useState<Set<string>>(new Set())
  const [undoHistory, setUndoHistory] = useState<UndoEntry[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Load active factions
  useEffect(() => {
    if (!userId) return
    const saved = localStorage.getItem(`marathon-active-factions-${userId}`)
    if (saved) {
      try {
        setActiveFactions(new Set(JSON.parse(saved)))
      } catch {}
    }
  }, [userId])

  // Load/save scale preference
  useEffect(() => {
    if (!userId) return
    const saved = localStorage.getItem(`marathon-spending-scale-${userId}`)
    if (saved) setScale(parseFloat(saved))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    localStorage.setItem(`marathon-spending-scale-${userId}`, String(scale))
  }, [scale, userId])

  // Load vault order with locks applied
  useEffect(() => {
    async function loadOrder() {
      const saved = loadVaultOrder()
      const lockedOrders = await getAllLockedTierOrders()

      let finalOrder: string[] = []
      const TIER_ORDER: Tier[] = ['prestige', 'superior', 'deluxe', 'enhanced', 'standard']

      TIER_ORDER.forEach(tier => {
        const tierMaterials = materials.filter(m => m.tier === tier).map(m => m.id)
        if (lockedOrders[tier]) {
          finalOrder = [...finalOrder, ...lockedOrders[tier]]
        } else {
          const tierSaved = saved.filter(id => tierMaterials.includes(id))
          const tierMissing = tierMaterials.filter(id => !tierSaved.includes(id))
          finalOrder = [...finalOrder, ...tierSaved, ...tierMissing]
        }
      })

      setVaultOrder(finalOrder)
    }
    loadOrder()
  }, [])

  const visibleMaterials = (() => {
    let items = selectedFaction
      ? factions.find(f => f.id === selectedFaction)?.materials
          .map(({ materialId }) => materials.find(m => m.id === materialId))
          .filter((m): m is typeof materials[0] => !!m && getState(m.id).have > 0)
        || []
      : materials.filter(m => getState(m.id).have > 0)

    // Sort by vault order
    if (vaultOrder.length > 0) {
      items = items.sort((a, b) => {
        const indexA = vaultOrder.indexOf(a.id)
        const indexB = vaultOrder.indexOf(b.id)
        return (indexA === -1 ? 9999 : indexA) - (indexB === -1 ? 9999 : indexB)
      })
    }

    return items
  })()

  function handleSpend(materialId: string) {
    const state = getState(materialId)
    if (state.have <= 0) return

    // Find factions that contain this material. Prefer active ones, but
    // fall back to all factions that need it so a spend can always be
    // attributed to a faction.
    const activeWithMaterial = factions.filter(
      f => f.materials.some(m => m.materialId === materialId) && activeFactions.has(f.id)
    )
    const factionsWithMaterial = activeWithMaterial.length > 0
      ? activeWithMaterial
      : factions.filter(f => f.materials.some(m => m.materialId === materialId))

    if (factionsWithMaterial.length === 0) return

    setSpendModal({
      materialId,
      factions: factionsWithMaterial,
      selectedFactionId: factionsWithMaterial.length === 1 ? factionsWithMaterial[0].id : null,
      quantity: 1,
    })
  }

  function confirmSpend() {
    if (!spendModal || !spendModal.selectedFactionId) return
    const { materialId, selectedFactionId } = spendModal

    const state = getState(materialId)
    const qty = Math.max(1, Math.min(spendModal.quantity, state.have))

    setNeed(materialId, Math.max(0, state.need - qty))
    spend(materialId, qty)
    showSpendFlash(materialId)
    setUndoHistory([{ materialId, factionId: selectedFactionId, quantity: qty }, ...undoHistory.slice(0, 9)])
    setSpendModal(null)
  }

  function showSpendFlash(materialId: string) {
    setFlash(f => ({ ...f, [materialId]: 'success' }))
    setTimeout(() => setFlash(f => { const n = { ...f }; delete n[materialId]; return n }), 400)
  }

  function handleUndo() {
    if (undoHistory.length === 0) return
    const [lastEntry, ...rest] = undoHistory
    setUndoHistory(rest)

    const state = getState(lastEntry.materialId)

    // Restore the need and the have count for the spent quantity
    setNeed(lastEntry.materialId, state.need + lastEntry.quantity)
    spend(lastEntry.materialId, -lastEntry.quantity)
    setFlash(f => ({ ...f, [lastEntry.materialId]: 'warn' }))
  }

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (spendModal) {
        if (e.key === 'Enter') {
          e.preventDefault()
          confirmSpend()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setSpendModal(null)
        }
        return
      }
      if (e.key === 'Delete' && undoHistory.length > 0) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [undoHistory, spendModal])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // close any open modals if needed
      }
    }
    window.addEventListener('mousedown', handleOutside)
    return () => window.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={containerRef} className="mb-6">
      {/* Spend modal — pick faction (required) + quantity */}
      {spendModal && (() => {
        const mat = materials.find(m => m.id === spendModal.materialId)
        const state = getState(spendModal.materialId)
        const canConfirm = !!spendModal.selectedFactionId && spendModal.quantity >= 1
        return (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f1117] border border-gray-700 rounded-lg w-full max-w-sm">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
                {mat?.image && (
                  <Image
                    src={mat.image}
                    alt={mat.name}
                    width={44}
                    height={44}
                    className="rounded object-contain"
                    style={{ border: `3px solid ${TIER_BORDER_COLORS[mat.tier]}` }}
                  />
                )}
                <div>
                  <h3 className="text-white font-bold">{mat?.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Have {state.have}</p>
                </div>
              </div>

              {/* Faction picker */}
              <div className="px-5 py-3">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Spend from faction</div>
                <div className="space-y-2">
                  {spendModal.factions.map(faction => {
                    const selected = spendModal.selectedFactionId === faction.id
                    return (
                      <button
                        key={faction.id}
                        onClick={() => setSpendModal(s => s && { ...s, selectedFactionId: faction.id })}
                        className={`w-full text-left px-4 py-2 rounded border transition-all ${
                          faction.bgColor
                        } ${faction.color} ${
                          selected ? 'border-current ring-2 ring-[#b8ff00]' : faction.borderColor + ' opacity-70 hover:opacity-100'
                        }`}
                      >
                        {faction.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quantity */}
              <div className="px-5 py-3 border-t border-gray-800">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Quantity</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSpendModal(s => s && { ...s, quantity: Math.max(1, s.quantity - 1) })}
                    className="w-10 h-10 border border-gray-700 text-gray-300 rounded hover:border-gray-500 text-lg"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={state.have}
                    value={spendModal.quantity}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10)
                      setSpendModal(s => s && { ...s, quantity: isNaN(v) ? 1 : Math.max(1, Math.min(v, state.have)) })
                    }}
                    autoFocus
                    className="flex-1 text-center bg-[#161c27] border border-gray-700 rounded h-10 text-white font-bold"
                  />
                  <button
                    onClick={() => setSpendModal(s => s && { ...s, quantity: Math.min(state.have, s.quantity + 1) })}
                    className="w-10 h-10 border border-gray-700 text-gray-300 rounded hover:border-gray-500 text-lg"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setSpendModal(s => s && { ...s, quantity: state.have })}
                    className="px-3 h-10 text-xs border border-gray-700 text-gray-400 rounded hover:border-gray-500 shrink-0"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-800 flex gap-2">
                <button
                  onClick={() => setSpendModal(null)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-700 text-gray-400 rounded hover:border-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSpend}
                  disabled={!canConfirm}
                  className={`flex-1 px-4 py-2 text-sm font-bold rounded transition-colors ${
                    canConfirm
                      ? 'bg-[#b8ff00] text-black hover:opacity-90'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  Spend {spendModal.quantity}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Click an item → pick faction + quantity to spend. Delete undoes the last spend.
        </p>
        {/* Zoom slider */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 shrink-0">Size:</label>
          <input
            type="range"
            min="0.6"
            max="1.5"
            step="0.1"
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            className="w-24 accent-[#b8ff00]"
          />
          <span className="text-xs text-gray-400 w-8 text-right">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: 'repeat(8, minmax(80px, 1fr))',
            width: 'fit-content',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
        {visibleMaterials.map(m => {
          const span = TIER_SPAN[m.tier]
          const state = getState(m.id)
          const flashState = flash[m.id]

          // Calculate aspect ratio accounting for gap (8px gap between cells)
          // With 8 columns, each gap ≈ 1/8 of column width (10% factor)
          // So 2 columns + 1 gap ≈ 2.1 units wide
          // And 2 rows + 1 gap ≈ 2.1 units tall
          const gapFactor = 0.1
          const width = span.col + (span.col > 1 ? gapFactor : 0)
          const height = span.row + (span.row > 1 ? gapFactor : 0)
          const aspectRatioValue = (width / height).toFixed(2)

          return (
            <div
              key={m.id}
              onClick={() => handleSpend(m.id)}
              className={`relative bg-[#161c27] cursor-pointer select-none overflow-hidden transition-all ${
                flashState === 'success' ? 'ring-2 ring-green-500' : ''
              }`}
              style={{
                gridColumn: `span ${span.col}`,
                gridRow: `span ${span.row}`,
                aspectRatio: aspectRatioValue,
              }}
            >
              {/* Image with tier border - fills tile */}
              {m.image && (
                <Image
                  src={m.image}
                  alt={m.name}
                  fill
                  className="object-cover"
                  style={{ border: `3px solid ${TIER_BORDER_COLORS[m.tier]}` }}
                  sizes="15vw"
                />
              )}

              {/* Count */}
              {state.have > 0 && (
                <div className="absolute bottom-1 right-1 bg-black/80 px-2 py-1 text-white text-sm font-bold z-10 rounded">
                  ×{state.have}
                </div>
              )}

              {/* Spent indicator */}
              {flashState === 'success' && (
                <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center z-20">
                  <span className="text-2xl">✓</span>
                </div>
              )}
            </div>
          )
        })}
        </div>
      </div>

      {visibleMaterials.length === 0 && (
        <div className="border border-gray-800 rounded-lg px-6 py-10 text-center">
          <div className="text-gray-400 text-sm">
            {selectedFaction ? "You don't have any of these materials" : "No materials to spend"}
          </div>
        </div>
      )}

      {/* Undo indicator */}
      {undoHistory.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 px-2 py-2 border border-gray-800 rounded-lg bg-gray-900/50">
          Press <span className="text-[#b8ff00] font-bold">Delete</span> to undo {undoHistory[0].materialId && materials.find(m => m.id === undoHistory[0].materialId)?.name} {undoHistory.length > 1 && `(+${undoHistory.length - 1} more)`}
        </div>
      )}
    </div>
  )
}
