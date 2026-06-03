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

export default function MaterialsPage() {
  return (
    <div>
      <h1 className="text-lg font-bold text-white tracking-wide mb-6">All Salvage Materials</h1>
      <div className="space-y-8">
        {TIER_ORDER.map(tier => (
          <div key={tier}>
            <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${TIER_COLORS[tier]}`}>
              {TIER_LABELS[tier]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {materials.filter(m => m.tier === tier).map(m => (
                <Link
                  key={m.id}
                  href={`/materials/${m.id}`}
                  className={`border rounded-lg px-4 py-3 hover:opacity-80 transition-opacity ${TIER_BG[tier]} border-gray-800 flex items-center gap-3`}
                >
                  {m.image && (
                    <Image
                      src={m.image}
                      alt={m.name}
                      width={64}
                      height={64}
                      className="rounded shrink-0 object-contain bg-black/30"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white truncate">{m.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">◈ {m.value.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{m.salvageType.join(', ')}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
