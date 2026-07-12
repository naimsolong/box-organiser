<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()

interface WarehouseOption {
  id: number
  name: string
  role: 'owner' | 'editor' | 'viewer'
}

const { data: warehousesData } = await useAsyncData('warehouses:list:newbox', () =>
  $fetch<{ personalBoxCount: number; warehouses: { id: number; name: string; role: string }[] }>('/api/warehouses'),
)

const editableWarehouses = computed<WarehouseOption[]>(() =>
  (warehousesData.value?.warehouses ?? [])
    .filter((w) => w.role === 'owner' || w.role === 'editor')
    .map((w) => ({ id: w.id, name: w.name, role: w.role as 'owner' | 'editor' | 'viewer' })),
)

const queryWarehouseId = computed(() => {
  const v = route.query.warehouseId
  const n = Number(v)
  return Number.isFinite(n) ? n : null
})

const form = reactive({
  name: '',
  location: '',
  category: '',
  status: 'active',
  warehouseId: queryWarehouseId.value ?? '' as number | '',
})

const err = ref('')
const loading = ref(false)

async function submit() {
  err.value = ''
  if (!form.name) {
    err.value = 'Name is required'
    return
  }
  loading.value = true
  try {
    const body: Record<string, unknown> = {
      name: form.name,
      location: form.location || null,
      category: form.category || null,
      status: form.status,
    }
    if (form.warehouseId) body.warehouseId = form.warehouseId
    const created = await $fetch<{ id: number }>('/api/boxes', { method: 'POST', body })
    await navigateTo(`/boxes/${created.id}`)
  } catch (e: any) {
    err.value = e?.statusMessage || e?.data?.message || 'Failed to create box'
  } finally {
    loading.value = false
  }
}

function clearWarehouse() {
  form.warehouseId = ''
  router.replace({ query: {} })
}
</script>

<template>
  <div>
    <NuxtLink to="/" class="muted">← Back</NuxtLink>
    <h1 style="margin-top: 0.5rem">New box</h1>

    <form class="card grid" style="max-width: 480px" @submit.prevent="submit">
      <div>
        <label>Name *</label>
        <input v-model="form.name" class="input" required />
      </div>
      <div>
        <label>Location</label>
        <input v-model="form.location" class="input" placeholder="e.g. Garage shelf B" />
      </div>
      <div>
        <label>Category</label>
        <input v-model="form.category" class="input" placeholder="e.g. Tools" />
      </div>
      <div>
        <label>Status</label>
        <select v-model="form.status" class="select">
          <option value="active">Active</option>
          <option value="sealed">Sealed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div v-if="editableWarehouses.length">
        <label>Warehouse</label>
        <div class="row" style="gap: 0.25rem">
          <select v-model="form.warehouseId" class="select" style="flex: 1">
            <option value="">Personal (not in a warehouse)</option>
            <option v-for="w in editableWarehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
          <button v-if="form.warehouseId" type="button" class="btn btn-sm" @click="clearWarehouse">Clear</button>
        </div>
        <p class="muted" style="font-size: 0.8rem; margin: 0.25rem 0 0">
          You can move a box to another warehouse later.
        </p>
      </div>
      <p v-if="err" class="badge badge-warn">{{ err }}</p>
      <div class="row">
        <button class="btn btn-primary" type="submit" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create box' }}
        </button>
        <NuxtLink to="/" class="btn">Cancel</NuxtLink>
      </div>
      <p class="muted">A QR code will be generated automatically.</p>
    </form>
  </div>
</template>
