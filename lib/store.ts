'use client'

import { useEffect, useState } from 'react'

export interface MaterialState {
  need: number
  have: number
}

type TrackerStore = Record<string, MaterialState>

const STORAGE_KEY = 'marathon-tracker'

function load(): TrackerStore {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function save(store: TrackerStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function useTracker() {
  const [store, setStore] = useState<TrackerStore>({})

  useEffect(() => {
    setStore(load())
  }, [])

  function getState(id: string): MaterialState {
    return store[id] ?? { need: 0, have: 0 }
  }

  function setNeed(id: string, need: number) {
    const next = { ...store, [id]: { ...getState(id), need: Math.max(0, need) } }
    setStore(next)
    save(next)
  }

  function adjustHave(id: string, delta: number) {
    const cur = getState(id)
    const next = { ...store, [id]: { ...cur, have: Math.max(0, cur.have + delta) } }
    setStore(next)
    save(next)
  }

  function setHave(id: string, have: number) {
    const next = { ...store, [id]: { ...getState(id), have: Math.max(0, have) } }
    setStore(next)
    save(next)
  }

  return { getState, setNeed, adjustHave, setHave, store }
}
