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

// How many grid columns each tier spans
const TIER_SPAN: Record<Tier, { col: number; row: number }> = {
  prestige:  { col: 2, row: 2 },
  superior:  { col: 2, row: 2 },
  deluxe:    { col: 2, row: 1 },
  enhanced:  { col: 1, row: 1 },
  standard:  { col: 1, row: 1 },
}

const TIER_VALUE_COLOR: Record<Tier, string> = {
  prestige: 'bg-yellow-500 text-black',
  superior: 'bg-purple-600 text-white',
  deluxe:   'bg-blue-600 text-white',
  enhanced: 'bg-green-600 text-white',
  standard: 'bg-gray-600 text-white',
}

function formatValue(v: number) {
  if (v >= 1000) return `${v / 1000}k`
  return String(v)
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
// Sortable item
// ---------------------------------------------------------------------------
interface ItemProps {
  material: Material
  have: number
  isSelected: boolean
  onSelect: () => void
}

function VaultItem({ material: m, have, isSelected, onSelect }: ItemProps) {
  const span = TIER_SPAN[m.tier]
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: m.id })

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
      className={`relative bg-[#1a1f2e] border-2 rounded cursor-pointer select-none transition-colors overflow-hidden
        ${isSelected ? 'border-[#b8ff00]' : 'border-gray-700 hover:border-gray-500'}
      `}
    >
      {/* Value badge top-left */}
      <div className={`absolute top-1.5 left-1.5 text-xs font-bold px-1.5 py-0.5 rounded z-10 ${TIER_VALUE_COLOR[m.tier]}`}>
        ◈{formatValue(m.value)}
      </div>

      {/* Material image */}
      <div className="w-full h-full flex items-center justify-center p-2 pt-7">
        {m.image ? (
          <Image
            src={m.image}
            alt={m.name}
            fill
            className="object-contain p-4 pt-8 pb-4"
            sizes="(max-width: 768px) 33vw, 20vw"
          />
        ) : (
          <span className="text-gray-600 text-xs text-center leading-tight px-1">{m.name}</span>
        )}
      </div>

      {/* Count bottom-right */}
      {have > 0 && (
        <div className="absolute bottom-1.5 right-2 text-white text-sm font-bold z-10">
          ×{have}
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-[#b8ff00] rounded pointer-events-none" />
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
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialise order: load saved, then fill in any missing/new materials in tier order
  useEffect(() => {
    const saved = loadOrder()
    const defaultOrder = TIER_ORDER.flatMap(tier =>
      materials.filter(m => m.tier === tier).map(m => m.id)
    )
    const missing = defaultOrder.filter(id => !saved.includes(id))
    const valid = saved.filter(id => materials.find(m => m.id === id))
    const merged = [...valid, ...missing]
    setOrder(merged)
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

  // Click outside to deselect
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelected(null)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const orderedMaterials = order
    .map(id => materials.find(m => m.id === id))
    .filter((m): m is Material => !!m)

  return (
    <div ref={containerRef}>
      <p className="text-xs text-gray-500 mb-4">
        Click an item to select · Click again to add · <kbd className="bg-gray-800 px-1 rounded">Delete</kbd> to subtract · Drag to reorder
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: 'repeat(6, 1fr)', gridAutoRows: '80px' }}
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
                      // already selected → increment
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
