import { useState, useRef, useCallback } from 'react'
import { ArrowUpDown, Trash2 } from 'lucide-react'
import { fmt } from '@/lib/utils'

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-rose-500',
  'bg-lime-500',
]

function hashColor(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function ExpenseList({ expenses, loading, pending = [], sending = [], onEdit, onDelete }) {
  const [reversed, setReversed] = useState(true)

  if (loading && expenses.length === 0 && pending.length === 0 && sending.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (expenses.length === 0 && pending.length === 0 && sending.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-4xl mb-3">📭</p>
        <p>No hay gastos variables este mes</p>
      </div>
    )
  }

  const displayExpenses = reversed ? [...expenses].reverse() : expenses

  return (
    <div className="space-y-2">
      {expenses.length > 1 && (
        <button
          onClick={() => setReversed((r) => !r)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {reversed ? 'Recientes primero' : 'Antiguos primero'}
        </button>
      )}
      {sending.map((exp) => (
        <div key={exp.id} className="glass-card rounded-xl p-3 flex items-center gap-3 border border-dashed border-primary/40 opacity-70">
          <div
            className={`w-10 h-10 rounded-full ${hashColor(exp.category)} flex items-center justify-center`}
          >
            <span className="text-white font-bold text-sm">
              {exp.category.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {exp.category}
            </p>
            <p className="text-[10px] text-primary animate-pulse">Enviando...</p>
          </div>
          <p className="text-sm font-bold text-foreground whitespace-nowrap">
            {fmt(exp.amount)}
          </p>
        </div>
      ))}
      {pending.map((exp) => (
        <div key={exp.id} className="glass-card rounded-xl p-3 flex items-center gap-3 border border-dashed border-primary/40">
          <div
            className={`w-10 h-10 rounded-full ${hashColor(exp.category)} flex items-center justify-center opacity-60`}
          >
            <span className="text-white font-bold text-sm">
              {exp.category.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {exp.category}
            </p>
            <p className="text-[10px] text-primary">Pendiente de sync</p>
          </div>
          <p className="text-sm font-bold text-foreground whitespace-nowrap">
            {fmt(exp.amount)}
          </p>
        </div>
      ))}
      {displayExpenses.map((exp) => (
        <SwipeableRow
          key={exp.row ?? `${exp.category}-${exp.amount}`}
          expense={exp}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function SwipeableRow({ expense, onEdit, onDelete }) {
  const startXRef = useRef(0)
  const currentXRef = useRef(0)
  const rowRef = useRef(null)
  const [swiped, setSwiped] = useState(false)
  const swipingRef = useRef(false)

  const THRESHOLD = 70

  const handleTouchStart = useCallback((e) => {
    startXRef.current = e.touches[0].clientX
    currentXRef.current = 0
    swipingRef.current = false
  }, [])

  const handleTouchMove = useCallback((e) => {
    const diff = startXRef.current - e.touches[0].clientX
    currentXRef.current = diff
    if (diff > 10) swipingRef.current = true
    const translateX = Math.max(-THRESHOLD, Math.min(0, -diff))
    if (rowRef.current) {
      rowRef.current.style.transform = `translateX(${translateX}px)`
      rowRef.current.style.transition = 'none'
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!rowRef.current) return
    rowRef.current.style.transition = 'transform 0.2s ease-out'
    if (currentXRef.current >= THRESHOLD) {
      rowRef.current.style.transform = `translateX(-${THRESHOLD}px)`
      setSwiped(true)
    } else {
      rowRef.current.style.transform = 'translateX(0)'
      setSwiped(false)
    }
  }, [])

  const handleClick = useCallback(() => {
    if (swipingRef.current) return
    if (swiped) {
      if (rowRef.current) {
        rowRef.current.style.transition = 'transform 0.2s ease-out'
        rowRef.current.style.transform = 'translateX(0)'
      }
      setSwiped(false)
      return
    }
    onEdit?.(expense)
  }, [swiped, onEdit, expense])

  const handleDelete = useCallback(() => {
    onDelete?.(expense)
  }, [onDelete, expense])

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete button behind the row */}
      <div className="absolute inset-y-0 right-0 flex items-center z-0">
        <button
          onClick={handleDelete}
          className="h-full w-[70px] bg-destructive flex items-center justify-center text-destructive-foreground"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
      {/* Swipeable content */}
      <div
        ref={rowRef}
        className="glass-card rounded-xl p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform relative z-10 bg-background"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div
          className={`w-10 h-10 rounded-full ${hashColor(expense.category)} flex items-center justify-center`}
        >
          <span className="text-white font-bold text-sm">
            {expense.category.charAt(0).toUpperCase()}
          </span>
        </div>
        <p className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
          {expense.category}
        </p>
        <p className="text-sm font-bold text-foreground whitespace-nowrap">
          {fmt(expense.amount)}
        </p>
      </div>
    </div>
  )
}
