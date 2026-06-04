'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { materials, TIER_ORDER, TIER_COLORS, TIER_BG, type Tier } from '@/lib/materials'
import { useTracker, getSavedUser, clearUser } from '@/lib/store'
import { getUserPins, pinMaterial, unpinMaterial } from '@/lib/supabase'
import UsernameGate from './UsernameGate'
import dynamic from 'next/dynamic'
const VaultMode = dynamic(() => import('./VaultMode'), { ssr: false })

const MAX_PINS = 3

const TIER_LABELS: Record<Tier, string> = {
  prestige: 'Prestige',
  superior: 'Superior',
  deluxe: 'Deluxe',
  enhanced: 'Enhanced',
  standard: 'Standard',
}

export default function TrackerClient() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = getSavedUser()
    if (saved) setUser(saved)
    setHydrated(true)
  }, [])

  const { getState, adjustHave, setHave, loading } = useTracker(user?.id ?? null)
  const [editingHave, setEditingHave] = useState<string | null>(null)
  const [filterTier, setFilterTier] = useState<Tier | 'all'>('all')
  const [hideComplete, setHideComplete] = useState(false)
  const [vaultMode, setVaultMode] = useState(false)
  const [pins, setPins] = useState<string[]>([])

  // Restore UI state from localStorage
  useEffect(() => {
    if (!user?.id) return
    const savedVault = localStorage.getItem(`marathon-vault-mode-${user.id}`)
    const savedHideComplete = localStorage.getItem(`marathon-hide-complete-${user.id}`)
    if (savedVault === 'true') setVaultMode(true)
    if (savedHideComplete === 'true') setHideComplete(true)
  }, [user?.id])

  // Save UI state to localStorage
  useEffect(() => {
    if (!user?.id) return
    localStorage.setItem(`marathon-vault-mode-${user.id}`, String(vaultMode))
  }, [vaultMode, user?.id])

  useEffect(() => {
    if (!user?.id) return
    localStorage.setItem(`marathon-hide-complete-${user.id}`, String(hideComplete))
  }, [hideComplete, user?.id])

  useEffect(() => {
    if (user?.id) getUserPins(user.id).then(setPins).catch(() => {})
  }, [user?.id])

  async function togglePin(materialId: string) {
    if (!user) return
    if (pins.includes(materialId)) {
      await unpinMaterial(user.id, materialId)
      setPins(p => p.filter(id => id !== materialId))
    } else {
      if (pins.length >= MAX_PINS) return
      await pinMaterial(user.id, materialId)
      setPins(p => [...p, materialId])
    }
  }

  if (!hydrated) return null

  if (!user) {
    return <UsernameGate onUser={setUser} />
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-gray-500 text-sm">
        Loading your tracker...
      </div>
    )
  }

  const filtered = materials.filter(m => {
    if (filterTier !== 'all' && m.tier !== filterTier) return false
    if (hideComplete) {
      const s = getState(m.id)
      if (s.need > 0 && s.have >= s.need) return false
    }
    return true
  })

  const totalRemaining = materials.reduce((sum, m) => {
    const s = getState(m.id)
    return sum + Math.max(0, s.need - s.have)
  }, 0)

  const totalNeeded = materials.reduce((sum, m) => sum + getState(m.id).need, 0)

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
