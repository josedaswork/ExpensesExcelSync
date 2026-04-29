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

const fmt = (v) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

export default function ExpenseList({ expenses, loading, pending = [], sending = [], onEdit }) {
  if (loading) {
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

  return (
    <div className="space-y-2">
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
      {expenses.map((exp, i) => (
        <div
          key={i}
          className="glass-card rounded-xl p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => onEdit?.(exp)}
        >
          <div
            className={`w-10 h-10 rounded-full ${hashColor(exp.category)} flex items-center justify-center`}
          >
            <span className="text-white font-bold text-sm">
              {exp.category.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
            {exp.category}
          </p>
          <p className="text-sm font-bold text-foreground whitespace-nowrap">
            {fmt(exp.amount)}
          </p>
        </div>
      ))}
    </div>
  )
}
