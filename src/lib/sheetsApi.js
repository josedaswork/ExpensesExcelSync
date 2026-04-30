const STORAGE_KEY = 'sheets_script_url'
const DATA_CACHE_KEY = 'sheets_data_cache'
const PENDING_KEY = 'sheets_pending_expenses'

export function getScriptUrl() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function setScriptUrl(url) {
  localStorage.setItem(STORAGE_KEY, url)
}

export const DEFAULT_CATEGORIES = [
  'Fiesta bebida', 'Fiesta entradas', 'Restaurante', 'Bebidas',
  'Bizzum', 'Viajes tickets', 'Peluquerias', 'Cosmetico',
  'Chino Bazar', 'Cafetería', 'Restaurante (Tarjeta Rest)', 'Ocio',
  'Supermecado', 'Museo', 'Regalos', 'NOT TRACKED',
  'Transporte', 'Musica Tickets', 'Tramites',
]

/* ---- Helpers ---- */

async function callApi(params) {
  const url = getScriptUrl()
  if (!url) throw new Error('URL del script no configurada')

  const response = await fetch(url + '?' + new URLSearchParams(params), {
    redirect: 'follow',
  })

  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Respuesta no válida del servidor')
  }

  if (data.error) throw new Error(data.error)
  return data
}

function getCacheStore() {
  try {
    return JSON.parse(localStorage.getItem(DATA_CACHE_KEY) || '{}')
  } catch { return {} }
}

function setCacheEntry(key, data) {
  const store = getCacheStore()
  store[key] = { data, ts: Date.now() }
  localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(store))
}

function getCacheEntry(key) {
  const entry = getCacheStore()[key]
  if (!entry) return null
  return entry.data
}

export function getCachedSummary(month) {
  return getCacheEntry('summary_' + month)
}

export function getCachedExpenses(month) {
  return getCacheEntry('expenses_' + month)
}

/* ---- Categorías ---- */

export async function getCategories() {
  const data = await callApi({ action: 'getCategories' })
  return data
}

export function clearAllCache() {
  localStorage.removeItem(DATA_CACHE_KEY)
}

/* ---- Datos mensuales con caché offline ---- */

export async function getExpenses(month) {
  try {
    const data = await callApi({ action: 'getExpenses', month })
    setCacheEntry('expenses_' + month, data)
    return data
  } catch (err) {
    const cached = getCacheEntry('expenses_' + month)
    if (cached) return cached
    throw err
  }
}

export async function getSummary(month) {
  try {
    const data = await callApi({ action: 'getSummary', month })
    setCacheEntry('summary_' + month, data)
    return data
  } catch (err) {
    const cached = getCacheEntry('summary_' + month)
    if (cached) return cached
    throw err
  }
}

/* ---- Cola de gastos pendientes (offline) ---- */

export function getPendingExpenses() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
  } catch { return [] }
}

function savePendingExpenses(list) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(list))
}

export async function addExpenseDirect(month, category, amount) {
  return await callApi({
    action: 'addExpense',
    month,
    category,
    amount: String(amount),
  })
}

export function addToPending(month, category, amount) {
  const pending = getPendingExpenses()
  pending.push({ month, category, amount, id: Date.now() })
  savePendingExpenses(pending)
}

export async function updateExpense(month, row, oldCategory, oldAmount, newCategory, newAmount) {
  return await callApi({
    action: 'updateExpense',
    month,
    row: String(row),
    oldCategory,
    oldAmount: String(oldAmount),
    newCategory,
    newAmount: String(newAmount),
  })
}

export async function syncPendingExpenses() {
  const pending = getPendingExpenses()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  const failed = []

  for (const expense of pending) {
    try {
      await callApi({
        action: 'addExpense',
        month: expense.month,
        category: expense.category,
        amount: String(expense.amount),
      })
      synced++
    } catch {
      failed.push(expense)
    }
  }

  savePendingExpenses(failed)
  return { synced, failed: failed.length }
}

export function getPendingForMonth(month) {
  return getPendingExpenses().filter((e) => e.month === month)
}
