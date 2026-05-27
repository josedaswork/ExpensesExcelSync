import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Toaster, toast } from 'sonner'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { RefreshCw, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getScriptUrl,
  setScriptUrl as saveScriptUrl,
  getCategories as fetchCategories,
  getExpenses as fetchExpenses,
  getSummary as fetchSummary,
  addExpenseDirect,
  addToPending,
  updateExpense as apiUpdateExpense,
  syncPendingExpenses,
  getPendingForMonth,
  getPendingExpenses,
  DEFAULT_CATEGORIES,
  clearAllCache,
  getCachedSummary,
  getCachedExpenses,
  getCachedCategories,
} from '@/lib/sheetsApi'
import MonthSelector from '@/components/MonthSelector'
import MonthlySummary from '@/components/MonthlySummary'
import ExpenseList from '@/components/ExpenseList'
import AddExpenseModal from '@/components/AddExpenseModal'
import EditExpenseModal from '@/components/EditExpenseModal'
import SetupScreen from '@/components/SetupScreen'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function App() {
  const [scriptUrl, setScriptUrl] = useState(getScriptUrl())
  const [showSetup, setShowSetup] = useState(!scriptUrl)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [pendingCount, setPendingCount] = useState(getPendingExpenses().length)
  const [syncing, setSyncing] = useState(false)
  const [sendingExpenses, setSendingExpenses] = useState([])
  const queueRef = useRef([])
  const processingRef = useRef(false)
  const loadIdRef = useRef(0)

  const monthName = MONTHS[selectedMonth]

  const loadData = useCallback(async () => {
    if (!scriptUrl) return

    const currentLoadId = ++loadIdRef.current

    // Show cached data instantly, or clear old month's data
    const cachedSummary = getCachedSummary(monthName)
    const cachedExpenses = getCachedExpenses(monthName)
    setSummary(cachedSummary || null)
    setExpenses(cachedExpenses?.expenses || [])

    // Then refresh from server in background
    setLoading(true)
    try {
      const [s, e] = await Promise.all([
        fetchSummary(monthName),
        fetchExpenses(monthName),
      ])
      // Discard if month changed while fetching
      if (currentLoadId !== loadIdRef.current) return
      setSummary(s)
      setExpenses(e.expenses || [])
    } catch (err) {
      if (currentLoadId !== loadIdRef.current) return
      if (!cachedSummary && !cachedExpenses) {
        toast.error('Error cargando datos: ' + err.message)
      }
    } finally {
      if (currentLoadId === loadIdRef.current) setLoading(false)
    }
    setPendingCount(getPendingExpenses().length)
  }, [scriptUrl, monthName])

  const loadCategories = useCallback(async () => {
    if (!scriptUrl) return

    // Show cached categories instantly (or fallback), then refresh in background.
    const cachedCategories = getCachedCategories()
    if (cachedCategories?.categories?.length > 0) {
      setCategories(cachedCategories.categories)
    } else {
      setCategories((prev) => prev.length > 0 ? prev : DEFAULT_CATEGORIES)
    }

    try {
      const data = await fetchCategories()
      if (data.categories?.length > 0) {
        setCategories(data.categories)
        return
      }
    } catch (err) {
      console.warn('Error refrescando categorías en background:', err.message)
    }
  }, [scriptUrl])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadData() }, [loadData])

  const handleOpenAddModal = () => {
    setShowAddModal(true)
    if (categories.length === 0) loadCategories()
  }

  const handleAddExpense = (category, amount) => {
    const expense = { id: `q_${Date.now()}_${Math.random().toString(36).slice(2)}`, month: monthName, category, amount }
    queueRef.current = [...queueRef.current, expense]
    setSendingExpenses([...queueRef.current])
    setShowAddModal(false)
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
    toast('Enviando gasto...', { icon: '📤', duration: 1500 })
    processQueue()
  }

  const processQueue = async () => {
    if (processingRef.current) return
    processingRef.current = true

    while (queueRef.current.length > 0) {
      const item = queueRef.current[0]
      try {
        await addExpenseDirect(item.month, item.category, item.amount)
        queueRef.current = queueRef.current.slice(1)
        setSendingExpenses([...queueRef.current])
        toast.success(`"${item.category}" añadido`)
      } catch {
        addToPending(item.month, item.category, item.amount)
        queueRef.current = queueRef.current.slice(1)
        setSendingExpenses([...queueRef.current])
        setPendingCount(getPendingExpenses().length)
        toast.error(`Sin conexión — "${item.category}" guardado`)
      }
    }

    processingRef.current = false
    loadData()
  }

  const handleEditExpense = async (expense, newCategory, newAmount) => {
    setEditingExpense(null)
    const toastId = toast.loading('Actualizando gasto...')
    try {
      await apiUpdateExpense(monthName, expense.row, expense.category, expense.amount, newCategory, newAmount)
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
      toast.success('Gasto actualizado', { id: toastId })
      loadData()
    } catch (err) {
      toast.error('Error actualizando: ' + err.message, { id: toastId })
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { synced, failed } = await syncPendingExpenses()
      if (synced > 0) {
        toast.success(`${synced} gasto(s) sincronizado(s)`)
      }
      if (failed > 0) {
        toast.error(`${failed} gasto(s) no se pudieron sincronizar`)
      }
      if (synced === 0 && failed === 0) {
        toast.info('Nada pendiente de sincronizar')
      }
      setPendingCount(getPendingExpenses().length)
      if (synced > 0) loadData()
    } catch (err) {
      toast.error('Error sincronizando: ' + err.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleSetupSave = (url) => {
    if (url !== scriptUrl) clearAllCache()
    saveScriptUrl(url)
    setScriptUrl(url)
    setShowSetup(false)
  }

  const pendingForMonth = useMemo(() => getPendingForMonth(monthName), [monthName, pendingCount])
  const sendingForMonth = useMemo(() => sendingExpenses.filter((e) => e.month === monthName), [sendingExpenses, monthName])

  if (showSetup) {
    return (
      <>
        <SetupScreen onSave={handleSetupSave} initialUrl={scriptUrl} />
        <Toaster />
      </>
    )
  }

  return (
    <>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-12 pb-4">
          <h1 className="text-xl font-bold text-foreground">💰 Control Gastos</h1>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handleSync} disabled={loading || syncing} className="relative">
              <RefreshCw className={`h-5 w-5 ${(loading || syncing) ? 'animate-spin' : ''}`} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowSetup(true)}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Month selector */}
        <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} />

        {/* Summary */}
        <MonthlySummary summary={summary} loading={loading} />

        {/* Expense list */}
        <div className="flex-1 px-4 pb-24">
          <h2 className="text-lg font-semibold mb-3 text-foreground">
            Gastos Variables
          </h2>
          <ExpenseList
            expenses={expenses}
            loading={loading}
            pending={pendingForMonth}
            sending={sendingForMonth}
            onEdit={setEditingExpense}
          />
        </div>

        {/* FAB */}
        <button
          onClick={handleOpenAddModal}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>

      {showAddModal && (
        <AddExpenseModal
          categories={categories}
          onAdd={handleAddExpense}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          categories={categories}
          onSave={handleEditExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}

      <Toaster />
    </>
  )
}

export default App
