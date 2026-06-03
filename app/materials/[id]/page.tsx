import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getMaterialById, materials, TIER_COLORS, TIER_BG, type Tier } from '@/lib/materials'
import MaterialActions from '@/components/MaterialActions'

const TIER_LABELS: Record<Tier, string> = {
  prestige: 'Prestige',
  superior: 'Superior',
  deluxe: 'Deluxe',
  enhanced: 'Enhanced',
  standard: 'Standard',
}

export function generateStaticParams() {
  return materials.map(m => ({ id: m.id }))
}

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const material = getMaterialById(id)
  if (!material) notFound()

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block">
        ← Back to tracker
      </Link>

      {/* Header */}
      <div className={`border rounded-lg px-6 py-5 mb-6 ${TIER_BG[material.tier]} border-gray-800`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {material.image && (
              <Image
                src={material.image}
                alt={material.name}
                width={96}
                height={96}
                className="rounded-lg shrink-0 object-contain bg-black/30"
              />
            )}
            <div>
              <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${TIER_COLORS[material.tier]}`}>
                {TIER_LABELS[material.tier]}
              </div>
              <h1 className="text-2xl font-bold text-white">{material.name}</h1>
              <p className="text-gray-400 text-sm mt-2">{material.description}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500 mb-1">Value</div>
            <div className="text-white font-bold">◈ {material.value.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {material.salvageType.map(t => (
            <span key={t} className="text-xs border border-gray-700 rounded px-2 py-0.5 text-gray-400">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Quick adjust */}
      <div className="border border-gray-800 rounded-lg px-6 py-4 mb-6 bg-gray-900/30">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Your Count</div>
        <MaterialActions materialId={material.id} />
      </div>

      {/* Sources */}
      {material.sources.length > 0 && (
        <div className="border border-gray-800 rounded-lg px-6 py-4 mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">Drop Locations</div>
          <div className="space-y-4">
            {material.sources.map((source, i) => (
              <div key={i}>
                <div className="text-sm font-medium text-[#b8ff00] mb-1">{source.map}</div>
                {source.locations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-1">
                    {source.locations.map(loc => (
                      <span key={loc} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-gray-300">
                        {loc}
                      </span>
                    ))}
                  </div>
                )}
                {source.note && (
                  <div className="text-xs text-gray-500 italic">{source.note}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Used by */}
      {material.usedBy.length > 0 && (
        <div className="border border-gray-800 rounded-lg px-6 py-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Used For</div>
          <div className="space-y-1">
            {material.usedBy.map(use => (
              <div key={use} className="text-sm text-gray-300">• {use}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
