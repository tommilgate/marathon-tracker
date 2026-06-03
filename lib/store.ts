'use client'

import { useEffect, useState, useCallback } from 'react'
import { loadEntries, upsertEntry, type DbEntry } from './supabase'

export interface MaterialState {
  need: number
  have: number
}

type TrackerStore = Record<string, MaterialState>

const USER_KEY = 'marathon-user'

export function getSavedUser(): { id: string; username: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveUser(user: { id: string; username: string }) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
}

export function useTracker(userId: string | null) {
  const [store, setStore] = useState<TrackerStore>({})
  const [loading, setLoading] = useState(true)

  // Load from Supabase on mount / user change
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    loadEntries(userId).then((entries: DbEntry[]) => {
      const s: TrackerStore = {}
      entries.forEach(e => { s[e.material_id] = { need: e.need, have: e.have } })
      setStore(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  function getState(id: string): MaterialState {
    return store[id] ?? { need: 0, have: 0 }
  }

  const persist = useCallback((id: string, next: MaterialState) => {
    if (!userId) return
    upsertEntry(userId, id, next.need, next.have)
  }, [userId])

  function setNeed(id: string, need: number) {
    const cur = getState(id)
    const next = { ...cur, need: Math.max(0, need) }
    setStore(s => ({ ...s, [id]: next }))
    persist(id, next)
  }

  function adjustHave(id: string, delta: number) {
    const cur = getState(id)
    const next = { ...cur, have: Math.max(0, cur.have + delta) }
    setStore(s => ({ ...s, [id]: next }))
    persist(id, next)
  }

  function setHave(id: string, have: number) {
    const cur = getState(id)
    const next = { ...cur, have: Math.max(0, have) }
    setStore(s => ({ ...s, [id]: next }))
    persist(id, next)
  }

  // Spend: reduces both have and need together — remaining stays the same
  // (you didn't find new materials, you used some — still need the same amount more)
  function spend(id: string, amount: number) {
    const cur = getState(id)
    const next = {
      have: Math.max(0, cur.have - amount),
      need: Math.max(0, cur.need - amount),
    }
    setStore(s => ({ ...s, [id]: next }))
    persist(id, next)
  }

  return { getState, setNeed, adjustHave, setHave, spend, store, loading }
}
