import Image from 'next/image'
import Link from 'next/link'
import { materials, TIER_ORDER, TIER_COLORS, TIER_BG, type Tier } from '@/lib/materials'

const TIER_LABELS: Record<Tier, string> = {
  prestige: 'Prestige',
  superior: 'Superior',
  deluxe: 'Deluxe',
  enhanced: 'Enhanced',
  standard: 'Standard',
}

// All salvage types in display order (Eccentric/Prestige excluded)
const SALVAGE_TYPES = [
  'Rod',
  'Compound',
  'Lens',
  'Plant',
  'Node',
  'Chempack',
  'Filament',
  'Resin',
  'Biostrip',
  'Wire',
  'Drive',
  'Circuit',
]

export default function CheatSheetPage() {
  // Build lookup: tier → salvageType → materials[]
  const grid: Record<Tier, Record<string, typeof materials>> = {} as Record<Tier, Record<string, typeof materials>>

  for (const tier of TIER_ORDER.filter(t => t !== 'prestige')) {
    grid[tier] = {}
    for (const type of SALVAGE_TYPES) {
      grid[tier][type] = materials.filter(
        m => m.tier === tier && m.salvageType.includes(type)
      )
    }
  }

  // Only show salvage type columns that have at least one material
  const TIERS = TIER_ORDER.filter(t => t !== 'prestige')
  const activeTypes = SALVAGE_TYPES.filter(type =>
    TIERS.some(tier => grid[tier][type].length > 0)
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white tracking-wide">Scav Cheat Sheet</h1>
        <p className="text-xs text-gray-500 mt-1">Materials grouped by salvage type — hover for name, click to open</p>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-20 pr-3 pb-2 text-left text-gray-500 font-medium uppercase tracking-widest text-xs">Tier</th>
              {activeTypes.map(type => (
                <th key={type} className="pb-2 px-1 text-center text-gray-400 font-medium min-w-[72px]">
                  {type}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIER_ORDER.filter(t => t !== 'prestige').map(tier => {
              const hasAny = activeTypes.some(type => grid[tier][type].length > 0)
              if (!hasAny) return null
              return (
                <tr key={tier} className="border-t border-gray-800/60">
                  {/* Tier label */}
                  <td className="pr-3 py-2 align-top">
                    <span className={`text-xs font-bold uppercase tracking-widest whitespace-nowrap ${TIER_COLORS[tier].split(' ')[0]}`}>
                      {TIER_LABELS[tier]}
                    </span>
                  </td>

                  {/* Material cells per type */}
                  {activeTypes.map(type => {
                    const mats = grid[tier][type]
                    return (
                      <td key={type} className="px-1 py-2 align-top">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {mats.length === 0 ? (
                            <div className="w-14 h-14 rounded border border-gray-800/30" />
                          ) : (
                            mats.map(m => (
                              <Link
                                key={m.id}
                                href={`/materials/${m.id}`}
                                title={m.name}
                                className={`group relative w-14 h-14 rounded border ${TIER_BG[m.tier]} border-gray-700 hover:border-[#b8ff00] transition-colors overflow-hidden flex items-center justify-center`}
                              >
                                {m.image ? (
                                  <Image
                                    src={m.image}
                                    alt={m.name}
                                    width={56}
                                    height={56}
                                    className="object-contain w-full h-full p-0.5"
                                  />
                                ) : (
                                  <span className="text-gray-600 text-xs text-center px-1 leading-tight">{m.name}</span>
                                )}
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  {m.name}
                                </div>
                              </Link>
                            ))
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
