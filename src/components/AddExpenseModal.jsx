import { useState, useMemo, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, ChevronDown } from 'lucide-react'

export default function AddExpenseModal({ categories, onAdd, onClose }) {
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories.filter((cat) => cat.toLowerCase().includes(q))
  }, [categories, search])

  const isValid = categories.includes(category)

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (cat) => {
    setCategory(cat)
    setSearch(cat)
    setOpen(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed)) return

    setSubmitting(true)
    try {
      await onAdd(category, parsed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-2xl p-6 pb-8 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Nuevo Gasto</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Cargando categorías...</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Categoría
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Selecciona categoría..."
                value={search}
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCategory('')
                  setOpen(true)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <ChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                onClick={() => { setOpen(!open); inputRef.current?.focus() }}
              />
            </div>
            {open && (
              <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-md border border-input bg-card shadow-lg">
                {filtered.length > 0 ? filtered.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      category === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    {cat}
                  </button>
                )) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Cantidad (€)
            </label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !amount || !isValid}>
            {submitting ? 'Añadiendo...' : 'Añadir Gasto'}
          </Button>
        </form>
        )}
      </div>
    </div>
  )
}
