'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getAllPins, type PinnedMaterial } from '@/lib/supabase'
import { getMaterialById } from '@/lib/materials'
import { getSavedUser } from '@/lib/store'

export default function HuntingBoard() {
  const [pins, setPins] = useState<PinnedMaterial[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)

  useEffect(() => {
    const u = getSavedUser()
    if (u) setMyUserId(u.id)
    getAllPins().then(setPins).catch(() => {})
  }, [])

  if (pins.length === 0) return null

  // Group by user
  const byUser = pins.reduce<Record<string, { username: string; materials: string[] }>>((acc, p) => {
    if (!acc[p.user_id]) acc[p.user_id] = { username: p.username, materials: [] }
    acc[p.user_id].materials.push(p.material_id)
    return acc
  }, {})

  // Put current user first
  const entries = Object.entries(byUser).sort(([a], [b]) => {
    if (a === myUserId) return -1
    if (b === myUserId) return 1
    return 0
  })

  return (
    <div className="border border-[#b8ff00]/20 bg-[#b8ff00]/5 rounded-lg px-5 py-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#b8ff00] text-sm">📍</span>
        <h2 className="text-sm font-bold text-white tracking-wide">Currently Hunting</h2>
        <span className="text-xs text-gray-500">— pin items on your tracker to show others what you need</span>
      </div>
      <div className="space-y-3">
        {entries.map(([userId, { username, materials: matIds }]) => (
          <div key={userId} className="flex items-center gap-3">
            <span className={`text-xs font-medium w-20 shrink-0 truncate ${userId === myUserId ? 'text-[#b8ff00]' : 'text-gray-400'}`}>
              {userId === myUserId ? `${username} (you)` : username}
            </span>
            <div className="flex gap-2 flex-wrap">
              {matIds.map(id => {
                const mat = getMaterialById(id)
                if (!mat) return null
                return (
                  <Link
                    key={id}
                    href={`/materials/${id}`}
                    title={mat.name}
                    className="group relative"
                  >
                    <div className="w-10 h-10 bg-gray-800 rounded border border-gray-700 group-hover:border-[#b8ff00] transition-colors overflow-hidden">
                      {mat.image && (
                        <Image src={mat.image} alt={mat.name} width={40} height={40}
                          className="object-contain w-full h-full p-0.5" />
                      )}
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {mat.name}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
