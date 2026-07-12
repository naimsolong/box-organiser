export type WarehouseRole = 'owner' | 'editor' | 'viewer'

export interface WarehouseSummary {
  id: number
  name: string
  description: string | null
  role: WarehouseRole
  createdAt: string
  memberCount: number
  boxCount: number
}

export interface WarehousesPayload {
  personalBoxCount: number
  warehouses: WarehouseSummary[]
}

const STORAGE_KEY = 'box-organiser:currentWarehouseId'

export function useWarehouses() {
  const data = useState<WarehousesPayload | null>('warehouses:data', () => null)
  const fetched = useState<boolean>('warehouses:fetched', () => false)
  const currentId = useState<number | null>('warehouses:currentId', () => null)

  function loadCurrentFromStorage() {
    if (currentId.value !== null) return
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const n = Number(raw)
    if (Number.isFinite(n)) currentId.value = n
  }

  function persistCurrent() {
    if (typeof window === 'undefined') return
    if (currentId.value == null) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, String(currentId.value))
    }
  }

  async function fetchAll(force = false) {
    if (fetched.value && !force && data.value) return data.value
    try {
      data.value = await $fetch<WarehousesPayload>('/api/warehouses')
    } catch {
      data.value = { personalBoxCount: 0, warehouses: [] }
    }
    fetched.value = true
    loadCurrentFromStorage()
    // Validate the persisted currentId against the fresh list.
    if (currentId.value != null) {
      const found = data.value.warehouses.find((w) => w.id === currentId.value)
      if (!found) currentId.value = data.value.warehouses[0]?.id ?? null
      else currentId.value = found.id
    }
    return data.value
  }

  function setCurrent(id: number | null) {
    currentId.value = id
    persistCurrent()
  }

  function current() {
    if (!data.value || currentId.value == null) return null
    return data.value.warehouses.find((w) => w.id === currentId.value) ?? null
  }

  async function refresh() {
    return await fetchAll(true)
  }

  function reset() {
    data.value = null
    fetched.value = false
    currentId.value = null
  }

  return { data, fetched, currentId, fetchAll, refresh, setCurrent, current, reset }
}
