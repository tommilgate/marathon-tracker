'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { materials, TIER_ORDER, TIER_COLORS, TIER_BG, type Tier, type Material } from '@/lib/materials'
import { useTracker, getSavedUser } from '@/lib/store'
import { factions } from '@/lib/factions'

const TIER_LABELS: Record<Tier, string> = {
  prestige: 'Prestige',
  superior: 'Superior',
  deluxe: 'Deluxe',
  enhanced: 'Enhanced',
  standard: 'Standard',
}

// Primary maps shown as main tabs
const MAIN_MAPS = ['Perimeter', 'Dire Marsh', 'Outpost', 'Cryo Archive']

// Everything else grouped under "Other Sources"
const OTHER_SOURCES = [
  'Lockdown Zones',
  'Locked Rooms',
  'Core Storage',
  'Arms Locker',
  'Bioprinter',
  'Tool Cart',
  'Munitions Crate',
  'Medical Cabinet',
  'Intercept',
  'Convoy',
  'Grassy Areas',
]

export default function MapsClient() {
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedMap, setSelectedMap] = useState<string>('Perimeter')
  const [hiddenTiers, setHiddenTiers] = useState<Set<Tier>>(new Set())
  const [showOther, setShowOther] = useState(false)
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null)

  useEffect(() => {
    const u = getSavedUser()
    if (u) setUserId(u.id)
  }, [])

  const { getState, loading } = useTracker(userId)

  function toggleTier(tier: Tier) {
    setHiddenTiers(prev => {
      const next = new Set(prev)
      next.has(tier) ? next.delete(tier) : next.add(tier)
      return next
    })
  }

  // Build a set of material IDs for the selected faction (null = all)
  const factionMaterialIds = selectedFaction
    ? new Set(factions.find(f => f.id === selectedFaction)?.materials.map(x => x.materialId) ?? [])
    : null

  function isNeeded(m: Material): boolean {
    const s = getState(m.id)
    if (s.need === 0 || s.have >= s.need) return false
    if (factionMaterialIds && !factionMaterialIds.has(m.id)) return false
    return true
  }

  function remaining(m: Material): number {
    const s = getState(m.id)
    return Math.max(0, s.need - s.have)
  }

  // For a given map name, get materials that drop there, grouped by sub-location
  function getMaterialsForMap(mapName: string): Record<string, Material[]> {
    const byLocation: Record<string, Material[]> = {}

    for (const m of materials) {
      if (!isNeeded(m)) continue
      if (hiddenTiers.has(m.tier)) continue

      const source = m.sources.find(s => s.map === mapName)
      if (!source) continue

      const locations = source.locations.length > 0 ? source.locations : ['General']
      for (const loc of locations) {
        if (!byLocation[loc]) byLocation[loc] = []
        // avoid duplicates (material appears in multiple locations of same map)
        if (!byLocation[loc].find(x => x.id === m.id)) {
          byLocation[loc].push(m)
        }
      }
    }

    return byLocation
  }

  // For "other sources", group by source name
  function getMaterialsForOtherSources(): Record<string, Material[]> {
    const bySource: Record<string, Material[]> = {}

    for (const m of materials) {
      if (!isNeeded(m)) continue
      if (hiddenTiers.has(m.tier)) continue

      for (const source of m.sources) {
        if (!OTHER_SOURCES.includes(source.map)) continue
        if (!bySource[source.map]) bySource[source.map] = []
        if (!bySource[source.map].find(x => x.id === m.id)) {
          bySource[source.map].push(m)
        }
      }
    }

    return bySource
  }

  const currentData = showOther
    ? getMaterialsForOtherSources()
    : getMaterialsForMap(selectedMap)

  const totalNeededOnMap = Object.values(currentData).flat()
    .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white tracking-wide">Maps</h1>
        <p className="text-xs text-gray-500 mt-1">Only showing materials you still need</p>
      </div>

      {/* Map selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {MAIN_MAPS.map(map => (
          <button
            key={map}
            onClick={() => { setSelectedMap(map); setShowOther(false) }}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              !showOther && selectedMap === map
                ? 'bg-[#b8ff00]/10 border-[#b8ff00] text-[#b8ff00]'
                : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
          >
            {map}
          </button>
        ))}
        <button
          onClick={() => setShowOther(true)}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            showOther
              ? 'bg-[#b8ff00]/10 border-[#b8ff00] text-[#b8ff00]'
              : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
          }`}
        >
          Other Sources
        </button>
      </div>

      {/* Faction filter */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs text-gray-600 self-center mr-1">Faction:</span>
        <button
          onClick={() => setSelectedFaction(null)}
          className={`px-3 py-1 rounded border text-xs transition-colors ${
            selectedFaction === null
              ? 'bg-white/10 border-gray-400 text-white'
              : 'border-gray-700 text-gray-500 hover:border-gray-500'
          }`}
        >
          All
        </button>
        {factions.filter(f => !f.tbc).map(f => (
          <button
            key={f.id}
            onClick={() => setSelectedFaction(selectedFaction === f.id ? null : f.id)}
            className={`px-3 py-1 rounded border text-xs transition-colors ${
              selectedFaction === f.id
                ? `${f.bgColor} ${f.borderColor} ${f.color}`
                : 'border-gray-700 text-gray-500 hover:border-gray-500'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Tier toggles */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs text-gray-600 self-center mr-1">Hide tier:</span>
        {TIER_ORDER.map(tier => (
          <button
            key={tier}
            onClick={() => toggleTier(tier)}
            className={`px-3 py-1 rounded border text-xs transition-colors ${
              hiddenTiers.has(tier)
                ? 'bg-gray-800 border-gray-700 text-gray-600 line-through'
                : `${TIER_BG[tier]} border-gray-700 ${TIER_COLORS[tier].split(' ')[0]}`
            }`}
          >
            {TIER_LABELS[tier]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading your tracker...</div>
      ) : !userId ? (
        <div className="text-gray-500 text-sm">
          <Link href="/" className="text-[#b8ff00] hover:underline">Sign in on the tracker</Link> to see what you need.
        </div>
      ) : totalNeededOnMap === 0 ? (
        <div className="border border-gray-800 rounded-lg px-6 py-10 text-center">
          <div className="text-2xl mb-2">✓</div>
          <div className="text-gray-400 text-sm">Nothing needed from {showOther ? 'other sources' : selectedMap}</div>
          <div className="text-gray-600 text-xs mt-1">
            {selectedFaction ? `No ${factions.find(f => f.id === selectedFaction)?.name} items needed here` : 'Either all collected or no items tracked from here'}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(currentData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([location, mats]) => {
              // Deduplicate
              const unique = mats.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
              if (unique.length === 0) return null
              return (
                <div key={location}>
                  <h2 className="text-sm font-bold text-[#b8ff00] mb-3 uppercase tracking-widest">
                    {location}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {unique.map(m => {
                      const rem = remaining(m)
                      return (
                        <Link
                          key={m.id}
                          href={`/materials/${m.id}`}
                          className={`border rounded-lg p-3 flex items-center gap-3 hover:border-[#b8ff00]/50 transition-colors ${TIER_BG[m.tier]} border-gray-700`}
                        >
                          {m.image && (
                            <Image
                              src={m.image}
                              alt={m.name}
                              width={64}
                              height={64}
                              className="rounded shrink-0 object-contain"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-white text-xs font-medium truncate">{m.name}</div>
                            <div className={`text-xs mt-0.5 ${TIER_COLORS[m.tier].split(' ')[0]}`}>
                              {TIER_LABELS[m.tier]}
                            </div>
                            <div className="text-gray-400 text-xs mt-0.5">
                              Need <span className="text-white font-bold">{rem}</span> more
                            </div>
                          </div>
                        </Link>
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
