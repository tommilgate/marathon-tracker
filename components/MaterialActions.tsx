'use client'

import { useEffect, useState } from 'react'
import { useTracker, getSavedUser } from '@/lib/store'

export default function MaterialActions({ materialId }: { materialId: string }) {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const u = getSavedUser()
    if (u) setUserId(u.id)
  }, [])

  const { getState, setNeed, adjustHave, setHave } = useTracker(userId)
  const [editingNeed, setEditingNeed] = useState(false)
  const [editingHave, setEditingHave] = useState(false)

  const s = getState(materialId)
  const remaining = Math.max(0, s.need - s.have)
  const isComplete = s.need > 0 && s.have >= s.need

  if (!userId) {
    return <p className="text-xs text-gray-600">Sign in on the tracker page to save your count.</p>
  }

  return (
    <div className="flex items-center gap-8">
      {/* Need */}
      <div>
        <div className="text-xs text-gray-500 mb-2">Need</div>
        {editingNeed ? (
          <input
            type="number"
            min={0}
            defaultValue={s.need}
            className="w-20 bg-gray-800 border border-[#b8ff00] rounded px-3 py-1.5 text-white text-center focus:outline-none"
            autoFocus
            onBlur={e => {
              setNeed(materialId, parseInt(e.target.value) || 0)
              setEditingNeed(false)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setNeed(materialId, parseInt((e.target as HTMLInputElement).value) || 0)
                setEditingNeed(false)
              }
              if (e.key === 'Escape') setEditingNeed(false)
            }}
          />
        ) : (
          <button
            onClick={() => setEditingNeed(true)}
            className="w-20 rounded border border-dashed border-gray-600 px-3 py-1.5 text-white text-center hover:border-gray-400 transition-colors"
          >
            {s.need || '—'}
          </button>
        )}
      </div>

      {/* Have */}
      <div>
        <div className="text-xs text-gray-500 mb-2">Have</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustHave(materialId, -1)}
            className="w-8 h-8 rounded border border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-400 transition-colors"
          >
            −
          </button>
          {editingHave ? (
            <input
              type="number"
              min={0}
              defaultValue={s.have}
              className="w-16 bg-gray-800 border border-[#b8ff00] rounded px-3 py-1.5 text-white text-center focus:outline-none"
              autoFocus
              onBlur={e => {
                setHave(materialId, parseInt(e.target.value) || 0)
                setEditingHave(false)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setHave(materialId, parseInt((e.target as HTMLInputElement).value) || 0)
                  setEditingHave(false)
                }
                if (e.key === 'Escape') setEditingHave(false)
              }}
            />
          ) : (
            <button
              onClick={() => setEditingHave(true)}
              className="w-16 rounded border border-gray-700 px-3 py-1.5 text-white text-center hover:border-gray-400 transition-colors"
            >
              {s.have}
            </button>
          )}
          <button
            onClick={() => adjustHave(materialId, 1)}
            className="w-8 h-8 rounded border border-gray-700 text-gray-400 hover:border-[#b8ff00] hover:text-[#b8ff00] transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Remaining */}
      {s.need > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">Remaining</div>
          <div className={`text-2xl font-bold ${isComplete ? 'text-green-400' : 'text-white'}`}>
            {isComplete ? '✓ Done' : remaining}
          </div>
        </div>
      )}
    </div>
  )
}
