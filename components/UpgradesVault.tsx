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

interface UpgradesVaultProps {
  userId: string | null
  selectedFaction: string | null
}

export default function UpgradesVault({ userId, selectedFaction }: UpgradesVaultProps) {
  const { getState, spend } = useTracker(userId)
  const [flash, setFlash] = useState<Record<string, 'success' | 'warn'>>({})
  const [vaultOrder, setVaultOrder] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

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

    spend(materialId, 1)
    setFlash(f => ({ ...f, [materialId]: 'success' }))
    setTimeout(() => setFlash(f => { const n = { ...f }; delete n[materialId]; return n }), 600)
  }

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
      <div className="mb-3">
        <p className="text-xs text-gray-500">
          Click an item to spend 1 — reduces both Have and Remaining
        </p>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(8, 1fr)', aspectRatio: '1' }}>
        {visibleMaterials.map(m => {
          const span = TIER_SPAN[m.tier]
          const state = getState(m.id)
          const flashState = flash[m.id]

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

      {visibleMaterials.length === 0 && (
        <div className="border border-gray-800 rounded-lg px-6 py-10 text-center">
          <div className="text-gray-400 text-sm">
            {selectedFaction ? "You don't have any of these materials" : "No materials to spend"}
          </div>
        </div>
      )}
    </div>
  )
}
