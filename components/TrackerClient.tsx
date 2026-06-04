'use client'

import { useState, useEffect } from 'react'
import { useTracker, getSavedUser, clearUser } from '@/lib/store'
import UsernameGate from './UsernameGate'
import dynamic from 'next/dynamic'
const VaultMode = dynamic(() => import('./VaultMode'), { ssr: false })

export default function TrackerClient() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = getSavedUser()
    if (saved) setUser(saved)
    setHydrated(true)
  }, [])

  const { loading } = useTracker(user?.id ?? null)

  if (!hydrated) return null

  if (!user) {
    return <UsernameGate onUser={setUser} />
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-gray-500 text-sm">
        Loading your vault...
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white tracking-wide">Vault</h1>
            <span className="text-xs text-gray-600">—</span>
            <span className="text-xs text-[#b8ff00]">{user.username}</span>
            <button
              onClick={() => { clearUser(); setUser(null) }}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              (switch)
            </button>
          </div>
        </div>
      </div>

      <VaultMode userId={user.id} />
    </div>
  )
}
