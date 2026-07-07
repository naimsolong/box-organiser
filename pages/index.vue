<script setup lang="ts">
interface BoxRow {
  id: number
  name: string
  location: string | null
  category: string | null
  status: string
  shareCode: string
  itemCount: number
  lowStockCount: number
  createdAt: string
}

const filters = reactive({ q: '', status: '', category: '' })
const params = computed(() => ({
  q: filters.q || undefined,
  status: filters.status || undefined,
  category: filters.category || undefined,
}))

const { data: boxes, refresh } = await useFetch<BoxRow[]>('/api/boxes', { query: params })

const statusClass: Record<string, string> = {
  active: 'badge-ok',
  sealed: 'badge',
  archived: 'badge-warn',
}
</script>

<template>
  <div>
    <div class="row" style="justify-content: space-between">
      <h1>Your boxes</h1>
      <NuxtLink to="/boxes/new" class="btn btn-primary">+ New box</NuxtLink>
    </div>

    <div class="card grid" style="margin: 1rem 0">
      <div class="row">
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

    <p v-if="!boxes?.length" class="muted">No boxes yet. Create your first one.</p>

    <div class="grid">
      <NuxtLink v-for="box in boxes" :key="box.id" :to="`/boxes/${box.id}`" class="card" style="display: block">
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
