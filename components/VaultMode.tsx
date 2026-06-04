'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { materials, type Material, type Tier, TIER_ORDER, TIER_COLORS } from '@/lib/materials'
import { useTracker, getSavedUser } from '@/lib/store'
import { getLockedTierOrder, setLockedTierOrder, getAllLockedTierOrders } from '@/lib/supabase'

const TIER_SPAN: Record<Tier, { col: number; row: number }> = {
  prestige: { col: 2, row: 2 },
  superior: { col: 2, row: 2 },
  deluxe:   { col: 2, row: 1 },
  enhanced: { col: 1, row: 1 },
  standard: { col: 1, row: 1 },
}

const ORDER_KEY = 'marathon-vault-order'
function loadOrder(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]') } catch { return [] }
}
function saveOrder(order: string[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order))
}

// ---------------------------------------------------------------------------
// Single vault cell
// ---------------------------------------------------------------------------
interface ItemProps {
  material: Material
  have: number
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onEdit: () => void
  onCommit: (val: number) => void
  onCancelEdit: () => void
}

function VaultItem({ material: m, have, isSelected, isEditing, onSelect, onEdit, onCommit, onCancelEdit }: ItemProps) {
  const span = TIER_SPAN[m.tier]
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id })

  // Pull dnd-kit's onPointerDown out so we can call it alongside ours
  const { onPointerDown: dndPointerDown, ...otherListeners } = (listeners ?? {}) as Record<string, unknown> & { onPointerDown?: React.PointerEventHandler }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${span.col}`,
    gridRow: `span ${span.row}`,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  useEffect(() => {
    if (isEditing) setTimeout(() => inputRef.current?.select(), 50)
  }, [isEditing])

  function handlePointerDown(e: React.PointerEvent) {
    dndPointerDown?.(e)           // let dnd-kit start tracking
    didLongPress.current = false
    holdTimer.current = setTimeout(() => {
      didLongPress.current = true
      onEdit()
    }, 600)
  }

  function handlePointerMove() {
    // pointer moved = user is dragging, cancel long-press
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  function handlePointerUp() {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    if (!didLongPress.current) onSelect()
  }

  function handlePointerLeave() {
    if (holdTimer.current) clearTimeout(holdTimer.current)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...otherListeners}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="relative bg-[#161c27] cursor-pointer select-none overflow-hidden"
    >
      {/* Image */}
      {m.image ? (
        <Image src={m.image} alt={m.name} fill className="object-contain" sizes="15vw" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-600 text-xs text-center leading-tight px-1">{m.name}</span>
        </div>
      )}

      {/* Count chip */}
      {have > 0 && !isEditing && (
        <div className="absolute bottom-0 right-0 bg-black/70 px-1.5 py-0.5 text-white text-xs font-bold z-10">
          ×{have}
        </div>
      )}

      {/* Inline edit overlay (long press) */}
      {isEditing && (
        <div
          className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20"
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="text-gray-400 text-xs mb-1 truncate px-1 text-center">{m.name}</div>
          <input
            ref={inputRef}
            type="number"
            min={0}
            defaultValue={have}
            className="w-3/4 bg-gray-800 border border-[#b8ff00] rounded px-2 py-1 text-white text-center text-sm focus:outline-none"
            onKeyDown={e => {
              if (e.key === 'Enter') onCommit(parseInt((e.target as HTMLInputElement).value) || 0)
              if (e.key === 'Escape') onCancelEdit()
            }}
            onBlur={e => onCommit(parseInt(e.target.value) || 0)}
          />
          <div className="text-gray-600 text-xs mt-1">Enter to confirm</div>
        </div>
      )}

      {/* Selected ring */}
      {isSelected && !isEditing && (
        <div className="absolute inset-0 ring-2 ring-inset ring-[#b8ff00] pointer-events-none" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Screenshot uploader with review step
// ---------------------------------------------------------------------------
type ScanResult = { id: string; count: number }

function ScreenshotUploader({ onResults }: { onResults: (r: ScanResult[]) => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'review' | 'error'>('idle')
  const [pending, setPending] = useState<ScanResult[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setStatus('loading')
    const reader = new FileReader()
    reader.onload = async e => {
      const dataUrl = e.target?.result as string
      const [header, base64] = dataUrl.split(',')
      const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/png'
      try {
        const res = await fetch('/api/analyze-vault', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
        })
        const data = await res.json()
        if (!res.ok) { setStatus('error'); return }
        if (data.items?.length) {
          setPending(data.items)
          setStatus('review')
        } else {
          setStatus('error')
        }
      } catch { setStatus('error') }
    }
    reader.readAsDataURL(file)
  }

  function updateCount(id: string, val: number) {
    setPending(p => p.map(x => x.id === id ? { ...x, count: Math.max(0, val) } : x))
  }

  function removeItem(id: string) {
    setPending(p => p.filter(x => x.id !== id))
  }

  if (status === 'review') {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0f1117] border border-gray-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-white font-bold">Review scan results</h2>
            <p className="text-gray-500 text-xs mt-0.5">Edit or remove any wrong values before applying</p>
          </div>
          <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
            {pending.map(({ id, count }) => {
              const mat = materials.find(m => m.id === id)
              if (!mat) return null
              return (
                <div key={id} className="flex items-center gap-3">
                  {mat.image && (
                    <Image src={mat.image} alt={mat.name} width={36} height={36} className="rounded object-contain bg-gray-800 shrink-0" />
                  )}
                  <span className="text-white text-sm flex-1 truncate">{mat.name}</span>
                  <input
                    type="number"
                    min={0}
                    value={count}
                    onChange={e => updateCount(id, parseInt(e.target.value) || 0)}
                    className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-[#b8ff00]"
                  />
                  <button onClick={() => removeItem(id)} className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              )
            })}
          </div>
          <div className="px-5 py-4 border-t border-gray-800 flex justify-between gap-3">
            <button
              onClick={() => { setPending([]); setStatus('idle') }}
              className="px-4 py-2 text-sm border border-gray-700 text-gray-400 rounded hover:border-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onResults(pending.filter(x => x.count > 0)); setStatus('idle'); setPending([]) }}
              className="px-4 py-2 text-sm bg-[#b8ff00] text-black font-bold rounded hover:bg-[#a3e600] transition-colors"
            >
              Apply {pending.filter(x => x.count > 0).length} items
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }}
      />
      <button
        onClick={() => { setStatus('idle'); fileRef.current?.click() }}
        disabled={status === 'loading'}
        className="px-3 py-1.5 text-xs border border-gray-600 text-gray-300 rounded hover:border-[#b8ff00] hover:text-[#b8ff00] transition-colors disabled:opacity-40 shrink-0"
      >
        {status === 'loading' ? '⏳ Scanning...' : '📷 Scan screenshot'}
      </button>
      {status === 'error' && (
        <span className="text-xs text-red-400 shrink-0">Couldn't read screenshot</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main vault
// ---------------------------------------------------------------------------
interface VaultModeProps {
  userId: string | null
}

export default function VaultMode({ userId }: VaultModeProps) {
  const { getState, adjustHave, setHave } = useTracker(userId)
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)

  const [order, setOrder] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [hideEmpty, setHideEmpty] = useState(false)
  const [lockedTiers, setLockedTiers] = useState<Set<Tier>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = getSavedUser()
    setUser(saved)
  }, [])

  // Restore hideEmpty from localStorage
  useEffect(() => {
    if (!userId) return
    const saved = localStorage.getItem(`marathon-vault-hide-empty-${userId}`)
    if (saved === 'true') setHideEmpty(true)
  }, [userId])

  // Save hideEmpty to localStorage
  useEffect(() => {
    if (!userId) return
    localStorage.setItem(`marathon-vault-hide-empty-${userId}`, String(hideEmpty))
  }, [hideEmpty, userId])

  useEffect(() => {
    async function loadOrderWithLocks() {
      const saved = loadOrder()
      const lockedOrders = await getAllLockedTierOrders()

      // Check which tiers have locks
      const locked = new Set<Tier>()
      Object.keys(lockedOrders).forEach(tier => {
        if (TIER_ORDER.includes(tier as Tier)) locked.add(tier as Tier)
      })
      setLockedTiers(locked)

      // Build order: use locked order for locked tiers, use saved/default for unlocked
      let finalOrder: string[] = []

      TIER_ORDER.forEach(tier => {
        const tierMaterials = materials.filter(m => m.tier === tier).map(m => m.id)

        if (lockedOrders[tier]) {
          // Use locked order
          finalOrder = [...finalOrder, ...lockedOrders[tier]]
        } else {
          // Use saved order, with missing added at end
          const tierSaved = saved.filter(id => tierMaterials.includes(id))
          const tierMissing = tierMaterials.filter(id => !tierSaved.includes(id))
          finalOrder = [...finalOrder, ...tierSaved, ...tierMissing]
        }
      })

      setOrder(finalOrder)
    }

    loadOrderWithLocks()
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string)
      const newIndex = order.indexOf(over.id as string)
      const next = arrayMove(order, oldIndex, newIndex)
      setOrder(next)
      saveOrder(next)
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (editing) return
    if (!selected) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      adjustHave(selected, -1)
    }
  }, [selected, editing, adjustHave])

  async function lockTierOrder(tier: Tier) {
    if (!user) return

    // Get all materials for this tier in current order
    const tierMaterials = order.filter(id => {
      const mat = materials.find(m => m.id === id)
      return mat?.tier === tier
    })

    // Save as locked order
    await setLockedTierOrder(tier, tierMaterials, user.id)
    setLockedTiers(prev => new Set(prev).add(tier))
  }

  function getTierLabel(tier: Tier): string {
    return tier.charAt(0).toUpperCase() + tier.slice(1)
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelected(null)
        setEditing(null)
      }
    }
    window.addEventListener('mousedown', handleOutside)
    return () => window.removeEventListener('mousedown', handleOutside)
  }, [])

  const orderedMaterials = order
    .map(id => materials.find(m => m.id === id))
    .filter((m): m is Material => !!m)
    .filter(m => !hideEmpty || getState(m.id).have > 0)

  return (
    <div ref={containerRef}>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <p className="text-xs text-gray-500">
          Click = +1 · Hold = type number · <kbd className="bg-gray-800 px-1 rounded">Delete</kbd> = −1 · Drag to reorder
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={hideEmpty}
              onChange={e => setHideEmpty(e.target.checked)}
              className="accent-[#b8ff00]"
            />
            Hide 0s
          </label>
          <ScreenshotUploader onResults={results => {
            for (const { id, count } of results) setHave(id, count)
          }} />
        </div>
      </div>

      {/* Lock tier buttons - thomas only */}
      {user && user.username === 'thomas' && (
        <div className="mb-4 pb-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 mb-2">Lock tier order for all users:</p>
          <div className="flex gap-2 flex-wrap">
            {TIER_ORDER.map(tier => (
              <button
                key={tier}
                onClick={() => lockTierOrder(tier)}
                className={`text-xs px-3 py-1 rounded border transition-colors ${
                  lockedTiers.has(tier)
                    ? `${TIER_COLORS[tier]} border-current bg-gray-900/50`
                    : 'border-gray-700 text-gray-500 hover:border-gray-500'
                }`}
              >
                {lockedTiers.has(tier) ? '🔒 ' : ''}
                {getTierLabel(tier)}
              </button>
            ))}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedMaterials.map(m => m.id)} strategy={rectSortingStrategy}>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: 'repeat(8, 1fr)', gridAutoRows: '115px' }}
          >
            {orderedMaterials.map(m => {
              const s = getState(m.id)
              return (
                <VaultItem
                  key={m.id}
                  material={m}
                  have={s.have}
                  isSelected={selected === m.id}
                  isEditing={editing === m.id}
                  onSelect={() => {
                    if (selected === m.id) adjustHave(m.id, 1)
                    else setSelected(m.id)
                  }}
                  onEdit={() => { setEditing(m.id); setSelected(null) }}
                  onCommit={val => { setHave(m.id, val); setEditing(null) }}
                  onCancelEdit={() => setEditing(null)}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
