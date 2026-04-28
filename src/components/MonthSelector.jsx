import { useRef, useEffect } from 'react'

const SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function MonthSelector({ selected, onChange }) {
  const itemRefs = useRef([])

  useEffect(() => {
    itemRefs.current[selected]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [selected])

  return (
    <div className="flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
      {SHORT.map((m, i) => (
        <button
          key={m}
          ref={(el) => (itemRefs.current[i] = el)}
          onClick={() => onChange(i)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            i === selected
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  )
}
