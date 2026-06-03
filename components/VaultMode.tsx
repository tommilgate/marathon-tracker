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
import { materials, type Material, type Tier } from '@/lib/materials'
import { useTracker } from '@/lib/store'

const TIER_ORDER: Tier[] = ['prestige', 'superior', 'deluxe', 'enhanced', 'standard']

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
  onSelect: () => void
}

function VaultItem({ material: m, have, isSelected, onSelect }: ItemProps) {
  const span = TIER_SPAN[m.tier]
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${span.col}`,
    gridRow: `span ${span.row}`,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className="relative bg-[#161c27] cursor-pointer select-none overflow-hidden"
    >
      {/* Image fills the entire cell — no padding */}
      {m.image ? (
        <Image
          src={m.image}
          alt={m.name}
          fill
          className="object-contain"
          sizes="15vw"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-600 text-xs text-center leading-tight px-1">{m.name}</span>
        </div>
      )}

      {/* Count — dark chip bottom-right */}
      {have > 0 && (
        <div className="absolute bottom-0 right-0 bg-black/70 px-1.5 py-0.5 text-white text-xs font-bold z-10">
          ×{have}
        </div>
      )}

      {/* Selected highlight */}
      {isSelected && (
        <div className="absolute inset-0 ring-2 ring-inset ring-[#b8ff00] pointer-events-none" />
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
  const { getState, adjustHave } = useTracker(userId)
  const [order, setOrder] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [hideEmpty, setHideEmpty] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = loadOrder()
    const defaultOrder = TIER_ORDER.flatMap(tier =>
      materials.filter(m => m.tier === tier).map(m => m.id)
    )
    const missing = defaultOrder.filter(id => !saved.includes(id))
    const valid = saved.filter(id => materials.find(m => m.id === id))
    setOrder([...valid, ...missing])
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
    if (!selected) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      adjustHave(selected, -1)
    }
  }, [selected, adjustHave])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setSelected(null)
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
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">
          Click to select · Click again to add · <kbd className="bg-gray-800 px-1 rounded">Delete</kbd> to subtract · Drag to reorder
        </p>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={e => setHideEmpty(e.target.checked)}
            className="accent-[#b8ff00]"
          />
          Hide items I have 0 of
        </label>
      </div>

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
                  onSelect={() => {
                    if (selected === m.id) {
                      adjustHave(m.id, 1)
                    } else {
                      setSelected(m.id)
                    }
                  }}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
