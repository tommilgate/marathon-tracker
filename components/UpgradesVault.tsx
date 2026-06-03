'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { materials, type Tier } from '@/lib/materials'
import { useTracker } from '@/lib/store'
import { factions } from '@/lib/factions'

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
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleMaterials = selectedFaction
    ? factions.find(f => f.id === selectedFaction)?.materials
        .map(({ materialId }) => materials.find(m => m.id === materialId))
        .filter((m): m is typeof materials[0] => !!m && getState(m.id).have > 0)
      || []
    : materials.filter(m => getState(m.id).have > 0)

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

      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(8, 1fr)', gridAutoRows: '115px' }}>
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
              {/* Image */}
              {m.image && (
                <Image
                  src={m.image}
                  alt={m.name}
                  fill
                  className="object-contain"
                  sizes="15vw"
                />
              )}

              {/* Count */}
              {state.have > 0 && (
                <div className="absolute bottom-0 right-0 bg-gray-900/85 px-1.5 py-0.5 text-white text-xs font-bold z-10">
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
