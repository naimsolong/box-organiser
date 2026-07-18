<script setup lang="ts">
interface BoxRow {
  id: number
  name: string
  location: string | null
  category: string | null
  status: string
  shareCode: string
  warehouseId: number | null
  itemCount: number
  lowStockCount: number
  createdAt: string
}

const route = useRoute()
const router = useRouter()

// Scope: 'all' (all accessible boxes), or a specific warehouseId number, or 'personal' (warehouseId IS NULL).
type Scope = 'all' | 'personal' | number
const scope = computed<Scope>(() => {
  const s = route.query.scope
  if (s === 'all' || s === 'personal') return s
  const n = Number(s)
  return Number.isFinite(n) ? n : 'all'
})

function setScope(s: Scope) {
  router.replace({ query: { ...route.query, scope: s === 'all' ? undefined : String(s) } })
}

const { data: warehousesData } = await useAsyncData('warehouses:list:dashboard', () =>
  $fetch<{ personalBoxCount: number; warehouses: { id: number; name: string; boxCount: number }[] }>(
    '/api/warehouses',
  ),
)

const params = computed(() => {
  const p: Record<string, string | number> = {}
  if (typeof scope.value === 'number') p.warehouseId = scope.value
  return p
})

const filters = reactive({ q: '', status: '', category: '' })
const queryParams = computed(() => ({
  ...params.value,
  q: filters.q || undefined,
  status: filters.status || undefined,
  category: filters.category || undefined,
}))

const { data: boxes, refresh } = await useFetch<BoxRow[]>('/api/boxes', { query: queryParams })

const statusClass: Record<string, string> = {
  active: 'badge-ok',
  sealed: 'badge',
  archived: 'badge-warn',
}

const newBoxHref = computed(() => {
  if (typeof scope.value === 'number') return `/boxes/new?warehouseId=${scope.value}`
  return '/boxes/new'
})
</script>

<template>
  <div>
    <div class="row" style="justify-content: space-between">
      <h1>Your boxes</h1>
      <NuxtLink :to="newBoxHref" class="btn btn-primary">+ New box</NuxtLink>
    </div>

    <div class="row scope-tabs" style="gap: 0.25rem; margin: 0.75rem 0; border-bottom: 1px solid #e5e7eb">
      <button class="tab" :class="{ active: scope === 'all' }" @click="setScope('all')">All accessible</button>
      <button class="tab" :class="{ active: scope === 'personal' }" @click="setScope('personal')">
        Personal ({{ warehousesData?.personalBoxCount ?? 0 }})
      </button>
      <button
        v-for="w in warehousesData?.warehouses ?? []"
        :key="w.id"
        class="tab"
        :class="{ active: scope === w.id }"
        @click="setScope(w.id)"
      >
        {{ w.name }} ({{ w.boxCount }})
      </button>
    </div>

    <div class="card grid" style="margin: 1rem 0">
      <div class="row filter-row">
        <input v-model="filters.q" class="input" placeholder="Search by name…" />
        <select v-model="filters.status" class="select" style="max-width: 150px">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="sealed">Sealed</option>
          <option value="archived">Archived</option>
        </select>
        <input v-model="filters.category" class="input" placeholder="Category" style="max-width: 150px" />
      </div>
    </div>

    <p v-if="!boxes?.length" class="muted">No boxes match this view.</p>

    <div class="grid">
      <NuxtLink v-for="box in boxes" :key="box.id" :to="`/boxes/${box.id}`" class="card" style="display: block; text-decoration: none; color: inherit">
        <div class="row" style="justify-content: space-between">
          <strong>{{ box.name }}</strong>
          <span class="badge" :class="statusClass[box.status]">{{ box.status }}</span>
        </div>
        <p class="muted" style="margin: 0.35rem 0">
          <span v-if="box.location">📍 {{ box.location }}</span>
          <span v-if="box.category"> · 🏷️ {{ box.category }}</span>
          <span v-if="!box.location && !box.category">No location/category</span>
        </p>
        <div class="row" style="gap: 0.4rem">
          <span class="badge">{{ box.itemCount }} item{{ box.itemCount === 1 ? '' : 's' }}</span>
          <span v-if="box.lowStockCount > 0" class="badge badge-warn">{{ box.lowStockCount }} low</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.tab {
  background: none;
  border: none;
  padding: 0.5rem 0.75rem;
  border-bottom: 2px solid transparent;
  font-size: 0.9rem;
  cursor: pointer;
  color: #6b7280;
}
.tab.active {
  color: #111827;
  border-bottom-color: #4338ca;
  font-weight: 500;
}

@media (max-width: 640px) {
  .scope-tabs {
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    scrollbar-width: none;
  }
  .scope-tabs::-webkit-scrollbar {
    display: none;
  }
  .filter-row {
    flex-direction: column;
  }
  .filter-row .input,
  .filter-row .select {
    max-width: 100% !important;
  }
}
</style>
