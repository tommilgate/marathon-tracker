'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { materials, TIER_ORDER, type Tier, type Material } from '@/lib/materials'
import { useTracker, getSavedUser } from '@/lib/store'

const TIER_LABELS: Record<Tier, string> = {
  standard:  'Grey Maxing',
  enhanced:  'Green Maxing',
  deluxe:    'Blue Maxing',
  superior:  'Purple Maxing',
  prestige:  'Gold Maxing',
}

const TIER_STYLE: Record<Tier, { text: string; border: string; bg: string; badge: string }> = {
  standard: { text: 'text-gray-300',   border: 'border-gray-500',   bg: 'bg-gray-500/10',   badge: 'bg-gray-500 text-white' },
  enhanced: { text: 'text-green-400',  border: 'border-green-500',  bg: 'bg-green-500/10',  badge: 'bg-green-500 text-black' },
  deluxe:   { text: 'text-blue-400',   border: 'border-blue-500',   bg: 'bg-blue-500/10',   badge: 'bg-blue-500 text-white' },
  superior: { text: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-500/10', badge: 'bg-purple-500 text-white' },
  prestige: { text: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-500/10', badge: 'bg-yellow-500 text-black' },
}

// Tier order for maxing — start from lowest (standard) up
const MAXING_ORDER: Tier[] = ['standard', 'enhanced', 'deluxe', 'superior', 'prestige']

export default function MaxingClient() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const u = getSavedUser()
    if (u) setUserId(u.id)
  }, [])

  const { getState, loading } = useTracker(userId)

  function remaining(m: Material): number {
    const s = getState(m.id)
    return Math.max(0, s.need - s.have)
  }

  function isTracked(m: Material): boolean {
    return getState(m.id).need > 0
  }

  // Find the current maxing tier — lowest tier with any remaining tracked items
  const currentTier = MAXING_ORDER.find(tier =>
    materials.some(m => m.tier === tier && isTracked(m) && remaining(m) > 0)
  )

  if (!userId) {
    return (
      <div className="text-gray-500 text-sm mt-8">
        <Link href="/" className="text-[#b8ff00] hover:underline">Sign in</Link> to use maxing mode.
      </div>
    )
  }

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>

  if (!currentTier) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🏆</div>
        <div className="text-white font-bold text-xl">All done!</div>
        <div className="text-gray-500 text-sm mt-2">No tracked materials remaining across any tier.</div>
      </div>
    )
  }

  const style = TIER_STYLE[currentTier]

  // All tracked incomplete materials in the current tier, sorted by remaining (lowest first)
  const tierMaterials = materials
    .filter(m => m.tier === currentTier && isTracked(m) && remaining(m) > 0)
    .sort((a, b) => remaining(a) - remaining(b))

  const priority = tierMaterials[0] // the one with fewest remaining

  // Get all unique map+location pairs for the priority item
  const priorityLocations: { map: string; location: string | null; note?: string }[] =
    priority.sources.flatMap(source =>
      source.locations.length > 0
        ? source.locations.map(loc => ({ map: source.map, location: loc as string | null, note: source.note }))
        : [{ map: source.map, location: null as string | null, note: source.note }]
    ).filter(s => !['Locked Rooms', 'Lockdown Zones', 'Intercept', 'Convoy'].includes(s.map))

  // Completion progress for this tier
  const tierTotal = materials.filter(m => m.tier === currentTier && isTracked(m))
  const tierDone = tierTotal.filter(m => remaining(m) === 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mb-3 ${style.badge}`}>
          {TIER_LABELS[currentTier]}
        </div>
        <h1 className="text-2xl font-bold text-white">What to farm now</h1>
        {tierTotal.length > 0 && (
          <p className="text-gray-500 text-sm mt-1">
            {tierDone.length}/{tierTotal.length} {currentTier} materials complete
            {tierDone.length < tierTotal.length && ` · ${tierTotal.length - tierDone.length} remaining`}
          </p>
        )}
      </div>

      {/* Progress through tiers — only show current + 2 ahead */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {MAXING_ORDER.map(tier => {
          const tierIndex = MAXING_ORDER.indexOf(tier)
          const currentIndex = MAXING_ORDER.indexOf(currentTier)
          const shouldShow = tierIndex <= currentIndex + 2

          if (!shouldShow) return null

          const mats = materials.filter(m => m.tier === tier && isTracked(m))
          const done = mats.filter(m => remaining(m) === 0).length
          const isCurrent = tier === currentTier
          const isComplete = mats.length > 0 && done === mats.length
          const s = TIER_STYLE[tier]
          return (
            <div key={tier}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isCurrent ? `${s.bg} ${s.border} ${s.text}` :
                isComplete ? 'border-green-800 bg-green-900/20 text-green-500' :
                'border-gray-800 text-gray-600'
              }`}
            >
              {isComplete ? '✓ ' : ''}{TIER_LABELS[tier].split(' ')[0]}
              {mats.length > 0 && <span className="opacity-60 ml-1">{done}/{mats.length}</span>}
            </div>
          )
        })}
      </div>

      {/* Priority item */}
      <div className={`border ${style.border} ${style.bg} rounded-xl p-5 mb-6`}>
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Priority target</div>
        <div className="flex items-center gap-4">
          {priority.image && (
            <Image src={priority.image} alt={priority.name} width={72} height={72}
              className="rounded-lg shrink-0 object-contain bg-black/30" />
          )}
          <div className="flex-1">
            <div className={`text-xl font-bold ${style.text}`}>{priority.name}</div>
            <div className="text-gray-400 text-sm mt-0.5">{priority.description}</div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-gray-500 text-sm">
                Have <span className="text-white font-medium">{getState(priority.id).have}</span>
              </span>
              <span className="text-gray-500 text-sm">
                Need <span className="text-white font-medium">{getState(priority.id).need}</span>
              </span>
              <span className={`text-sm font-bold ${style.text}`}>
                {remaining(priority)} left
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Where to go */}
      {priorityLocations.length > 0 && (
        <div className="mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Where to go</div>
          <div className="space-y-3">
            {/* Group by map */}
            {Object.entries(
              priorityLocations.reduce<Record<string, { locations: (string | null)[]; note?: string }>>((acc, { map, location, note }) => {
                if (!acc[map]) acc[map] = { locations: [], note }
                if (location && !acc[map].locations.includes(location)) acc[map].locations.push(location)
                return acc
              }, {})
            ).map(([map, { locations, note }]) => {
              // Find other materials you also need in these same locations
              const alsoNeeded = materials.filter(m =>
                m.id !== priority.id &&
                isTracked(m) &&
                remaining(m) > 0 &&
                m.sources.some(s =>
                  s.map === map &&
                  (locations.length === 0 || s.locations.length === 0 ||
                    s.locations.some(l => locations.includes(l)))
                )
              ).slice(0, 6)

              return (
                <div key={map} className="border border-gray-800 rounded-lg p-4">
                  <div className={`font-bold text-sm mb-2 ${style.text}`}>{map}</div>

                  {locations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {locations.map(loc => loc && (
                        <span key={loc} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-white">
                          {loc}
                        </span>
                      ))}
                    </div>
                  )}

                  {note && <p className="text-xs text-gray-500 italic mb-3">{note}</p>}

                  {alsoNeeded.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-600 mb-2">Also grab while you're here:</div>
                      <div className="flex flex-wrap gap-2">
                        {alsoNeeded.map(m => (
                          <Link key={m.id} href={`/materials/${m.id}`}
                            className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded px-2 py-1 hover:border-gray-500 transition-colors"
                            title={m.name}
                          >
                            {m.image && (
                              <Image src={m.image} alt={m.name} width={24} height={24}
                                className="rounded object-contain shrink-0" />
                            )}
                            <span className="text-xs text-gray-300">{m.name}</span>
                            <span className="text-xs text-gray-500">×{remaining(m)}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Other items in this tier */}
      {tierMaterials.length > 1 && (
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            Other {currentTier} items to knock out
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {tierMaterials.slice(1).map(m => (
              <Link key={m.id} href={`/materials/${m.id}`}
                className="flex items-center gap-2 border border-gray-800 rounded-lg px-3 py-2 hover:border-gray-600 transition-colors"
              >
                {m.image && (
                  <Image src={m.image} alt={m.name} width={32} height={32}
                    className="rounded shrink-0 object-contain" />
                )}
                <div className="min-w-0">
                  <div className="text-white text-xs font-medium truncate">{m.name}</div>
                  <div className={`text-xs ${style.text}`}>{remaining(m)} left</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
