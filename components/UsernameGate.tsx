'use client'

import { useState } from 'react'
import { getOrCreateUser } from '@/lib/supabase'
import { saveUser } from '@/lib/store'

interface Props {
  onUser: (user: { id: string; username: string }) => void
}

export default function UsernameGate({ onUser }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    try {
      const user = await getOrCreateUser(trimmed)
      saveUser(user)
      onUser(user)
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[#b8ff00] text-3xl mb-3">◈</div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Marathon Salvage</h1>
          <p className="text-gray-500 text-sm mt-2">Enter your name to load your tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="your name"
            autoFocus
            maxLength={32}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#b8ff00] transition-colors text-center text-lg tracking-wide"
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full bg-[#b8ff00] text-black font-bold py-3 rounded-lg hover:bg-[#a3e600] transition-colors disabled:opacity-40 disabled:cursor-not-allowed tracking-widest uppercase text-sm"
          >
            {loading ? 'Loading...' : 'Enter'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          New name = new tracker. Same name = your data loads back up.
        </p>
      </div>
    </div>
  )
}
