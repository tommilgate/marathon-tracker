'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { materials, TIER_ORDER, TIER_COLORS, TIER_BG, type Tier } from '@/lib/materials'
import { useTracker, getSavedUser } from '@/lib/store'
import { getUserPins } from '@/lib/supabase'
import { getMaterialById } from '@/lib/materials'

const TIER_LABELS: Record<Tier, string> = {
  prestige: 'Prestige',
  superior: 'Superior',
  deluxe: 'Deluxe',
  enhanced: 'Enhanced',
  standard: 'Standard',
}

export default function BarterClient() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [pins, setPins] = useState<string[]>([])

  useEffect(() => {
    const saved = getSavedUser()
    if (saved) setUser(saved)
    setHydrated(true)
  }, [])

  const { getState, loading } = useTracker(user?.id ?? null)

  useEffect(() => {
    if (user?.id) {
      getUserPins(user.id).then(setPins).catch(() => {})
    }
  }, [user?.id])

  if (!hydrated) return null

  if (!user) {
    return (
      <div className="text-gray-500 text-sm mt-8">
        <Link href="/" className="text-[#b8ff00] hover:underline">Sign in on the vault</Link> first.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-gray-500 text-sm">
        Loading completed items...
      </div>
    )
  }

  // Get items where need = 0 (fully done)
  const completeItems = materials
    .filter(m => {
      const state = getState(m.id)
      return state.need === 0 && state.have > 0
    })
    .sort((a, b) => {
      // Sort by tier order, then by have count descending
      const tierDiff = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
      if (tierDiff !== 0) return tierDiff
      return (getState(b.id).have || 0) - (getState(a.id).have || 0)
    })

  // Group by tier
  const byTier: Record<Tier, typeof completeItems> = {
    prestige: [],
    superior: [],
    deluxe: [],
    enhanced: [],
    standard: [],
  }

  completeItems.forEach(m => {
    byTier[m.tier].push(m)
  })

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Spend These</h1>
            <p className="text-xs text-gray-500 mt-1">
              Items you're 100% done farming — spend or trade with other players
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {user.username} · {completeItems.length} items ready
            </p>
          </div>
        </div>
      </div>

      {completeItems.length === 0 ? (
        <div className="border border-gray-800 rounded-lg px-6 py-10 text-center">
          <div className="text-gray-400 text-sm">No barter items yet</div>
          <div className="text-gray-600 text-xs mt-1">Complete your faction goals to see items here</div>
        </div>
      ) : (
        <div className="space-y-6">
          {TIER_ORDER.map(tier => {
            const tierItems = byTier[tier]
            if (tierItems.length === 0) return null

            return (
              <div key={tier}>
                <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${TIER_COLORS[tier]}`}>
                  {TIER_LABELS[tier]}
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {tierItems.map(m => {
                    const state = getState(m.id)
                    const isPinned = pins.includes(m.id)

                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-4 rounded-lg px-4 py-3 border transition-colors ${
                          isPinned
                            ? 'border-[#b8ff00]/40 bg-[#b8ff00]/5'
                            : 'border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        {m.image && (
                          <Image
                            src={m.image}
                            alt={m.name}
                            width={56}
                            height={56}
                            className="rounded shrink-0 object-contain bg-gray-800/50"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-medium">{m.name}</h3>
                            {isPinned && (
                              <span className="text-xs bg-[#b8ff00]/20 text-[#b8ff00] rounded px-1.5 py-0.5">
                                Hunting
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Have {state.have} available to trade
                          </div>
                        </div>

                        <Link
                          href={`/materials/${m.id}`}
                          className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded hover:border-[#b8ff00] hover:text-[#b8ff00] transition-colors shrink-0"
                        >
                          View
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
