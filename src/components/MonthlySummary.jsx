const fmt = (v) =>
  v != null
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
    : '—'

export default function MonthlySummary({ summary, loading }) {
  const cards = [
    { label: 'Ingresos', value: summary?.income, color: 'text-green-400' },
    { label: 'Gastos Fijos', value: summary?.fixedExpenses, color: 'text-orange-400' },
    { label: 'Gastos Variables', value: summary?.variableExpenses, color: 'text-red-400' },
    {
      label: 'Ahorro',
      value: summary?.savings,
      color: summary?.savings >= 0 ? 'text-green-400' : 'text-red-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
      {cards.map((c) => (
        <div key={c.label} className="glass-card rounded-xl p-3">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          {loading && !summary ? (
            <div className="h-6 w-20 bg-muted rounded animate-pulse mt-1" />
          ) : (
            <p className={`text-lg font-bold ${c.color}`}>{fmt(c.value)}</p>
          )}
        </div>
      ))}
    </div>
  )
}
