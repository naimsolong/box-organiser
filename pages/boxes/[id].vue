<script setup lang="ts">
interface Item {
  id: number
  name: string
  description: string | null
  quantity: number
  lowStockThreshold: number | null
}
interface BoxDetail {
  id: number
  name: string
  location: string | null
  category: string | null
  status: string
  shareCode: string
  items: Item[]
}

const route = useRoute()
const id = route.params.id as string
const { toQrDataUrl, shareUrl } = useQr()
const { exportQrPdf, exportManifestPdf } = usePdf()

const { data, refresh } = await useFetch<BoxDetail>(`/api/boxes/${id}`)
const box = computed(() => data.value)

// Box edit form
const boxForm = reactive({ name: '', location: '', category: '', status: 'active' })
const savingBox = ref(false)
watchEffect(() => {
  if (box.value) {
    boxForm.name = box.value.name
    boxForm.location = box.value.location ?? ''
    boxForm.category = box.value.category ?? ''
    boxForm.status = box.value.status
  }
})

async function saveBox() {
  savingBox.value = true
  try {
    await $fetch(`/api/boxes/${id}`, {
      method: 'PATCH',
      body: {
        name: boxForm.name,
        location: boxForm.location || null,
        category: boxForm.category || null,
        status: boxForm.status,
      },
    })
    await refresh()
  } finally {
    savingBox.value = false
  }
}

async function deleteBox() {
  if (!confirm('Delete this box and all its items?')) return
  await $fetch(`/api/boxes/${id}`, { method: 'DELETE' })
  await navigateTo('/')
}

// QR
const qrDataUrl = ref('')
const regenerating = ref(false)
watchEffect(async () => {
  if (box.value?.shareCode) {
    qrDataUrl.value = await toQrDataUrl(shareUrl(box.value.shareCode))
  }
})

async function regenerateQr() {
  if (!confirm('Regenerate QR code? Old QR prints will stop working.')) return
  regenerating.value = true
  try {
    await $fetch(`/api/boxes/${id}/regenerate-qr`, { method: 'POST' })
    await refresh()
  } finally {
    regenerating.value = false
  }
}

const qrSize = ref(60)
async function downloadQrPdf() {
  if (!qrDataUrl.value || !box.value) return
  await exportQrPdf(box.value.name, qrDataUrl.value, qrSize.value)
}

async function downloadManifest() {
  if (!qrDataUrl.value || !box.value) return
  await exportManifestPdf(box.value, box.value.items ?? [], qrDataUrl.value)
}

// Items
const items = computed(() => box.value?.items ?? [])
const newItem = reactive({ name: '', description: '', quantity: 1, lowStockThreshold: null as number | null })
const adding = ref(false)

async function addItem() {
  if (!newItem.name) return
  adding.value = true
  try {
    await $fetch(`/api/boxes/${id}/items`, {
      method: 'POST',
      body: {
        name: newItem.name,
        description: newItem.description || null,
        quantity: Number(newItem.quantity) || 1,
        lowStockThreshold: newItem.lowStockThreshold,
      },
    })
    newItem.name = ''
    newItem.description = ''
    newItem.quantity = 1
    newItem.lowStockThreshold = null
    await refresh()
  } finally {
    adding.value = false
  }
}

const editingId = ref<number | null>(null)
const editForm = reactive({ name: '', description: '', quantity: 1, lowStockThreshold: null as number | null })

function startEdit(item: Item) {
  editingId.value = item.id
  editForm.name = item.name
  editForm.description = item.description ?? ''
  editForm.quantity = item.quantity
  editForm.lowStockThreshold = item.lowStockThreshold
}

async function saveItem(itemId: number) {
  await $fetch(`/api/items/${itemId}`, {
    method: 'PATCH',
    body: {
      name: editForm.name,
      description: editForm.description || null,
      quantity: Number(editForm.quantity) || 1,
      lowStockThreshold: editForm.lowStockThreshold,
    },
  })
  editingId.value = null
  await refresh()
}

async function deleteItem(itemId: number) {
  if (!confirm('Delete this item?')) return
  await $fetch(`/api/items/${itemId}`, { method: 'DELETE' })
  await refresh()
}

function isLow(item: Item) {
  return item.lowStockThreshold !== null && item.quantity <= (item.lowStockThreshold ?? 0)
}
</script>

<template>
  <div v-if="box">
    <NuxtLink to="/" class="muted">← Back to boxes</NuxtLink>
    <div class="row" style="justify-content: space-between; margin-top: 0.5rem">
      <h1>{{ box.name }}</h1>
      <button class="btn btn-danger btn-sm" @click="deleteBox">Delete box</button>
    </div>

    <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0">
      <!-- QR panel -->
      <div class="card grid" style="align-items: center; text-align: center">
        <h2>QR code</h2>
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code" style="width: 200px; height: 200px" />
        <p class="muted" style="word-break: break-all">{{ shareUrl(box.shareCode) }}</p>
        <div class="row" style="justify-content: center">
          <button class="btn btn-sm" :disabled="regenerating" @click="regenerateQr">
            {{ regenerating ? 'Regenerating…' : 'Regenerate QR' }}
          </button>
          <a class="btn btn-sm" :href="`/b/${box.shareCode}`" target="_blank">Open public link</a>
        </div>
        <div class="row" style="justify-content: center; margin-top: 0.5rem">
          <label class="muted">Size</label>
          <select v-model.number="qrSize" class="select" style="max-width: 90px">
            <option :value="40">40mm</option>
            <option :value="60">60mm</option>
            <option :value="80">80mm</option>
            <option :value="100">100mm</option>
          </select>
          <button class="btn btn-sm btn-primary" :disabled="!qrDataUrl" @click="downloadQrPdf">Export QR PDF</button>
        </div>
      </div>

      <!-- Box edit panel -->
      <div class="card grid">
        <h2>Details</h2>
        <div>
          <label>Name</label>
          <input v-model="boxForm.name" class="input" />
        </div>
        <div>
          <label>Location</label>
          <input v-model="boxForm.location" class="input" />
        </div>
        <div>
          <label>Category</label>
          <input v-model="boxForm.category" class="input" />
        </div>
        <div>
          <label>Status</label>
          <select v-model="boxForm.status" class="select">
            <option value="active">Active</option>
            <option value="sealed">Sealed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div class="row">
          <button class="btn btn-primary btn-sm" :disabled="savingBox" @click="saveBox">
            {{ savingBox ? 'Saving…' : 'Save details' }}
          </button>
          <button class="btn btn-sm" :disabled="!qrDataUrl" @click="downloadManifest">Export manifest PDF</button>
        </div>
      </div>
    </div>

    <!-- Items -->
    <div class="card" style="margin-top: 1rem">
      <div class="row" style="justify-content: space-between">
        <h2>Items ({{ items.length }})</h2>
      </div>

      <form class="row" style="gap: 0.5rem; margin-bottom: 1rem" @submit.prevent="addItem">
        <input v-model="newItem.name" class="input" placeholder="Item name *" required style="flex: 2" />
        <input v-model="newItem.description" class="input" placeholder="Description" style="flex: 3" />
        <input v-model.number="newItem.quantity" type="number" min="1" class="input" placeholder="Qty" style="max-width: 70px" />
        <input v-model.number="newItem.lowStockThreshold" type="number" min="0" class="input" placeholder="Low" style="max-width: 70px" />
        <button class="btn btn-primary btn-sm" type="submit" :disabled="adding">Add</button>
      </form>

      <p v-if="!items.length" class="muted">No items yet.</p>
      <table v-else>
        <thead>
          <tr>
            <th style="width: 50px">Qty</th>
            <th>Name</th>
            <th>Description</th>
            <th style="width: 50px">Low</th>
            <th style="width: 140px"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in items" :key="item.id">
            <tr v-if="editingId !== item.id">
              <td>{{ item.quantity }}</td>
              <td>{{ item.name }}</td>
              <td class="muted">{{ item.description }}</td>
              <td>
                <span v-if="item.lowStockThreshold !== null" :class="['badge', isLow(item) ? 'badge-warn' : 'badge-ok']">
                  {{ isLow(item) ? 'low' : 'ok' }}
                </span>
              </td>
              <td>
                <div class="row" style="gap: 0.25rem">
                  <button class="btn btn-sm" @click="startEdit(item)">Edit</button>
                  <button class="btn btn-sm btn-danger" @click="deleteItem(item.id)">Del</button>
                </div>
              </td>
            </tr>
            <tr v-else>
              <td><input v-model.number="editForm.quantity" type="number" min="1" class="input" style="padding: 0.3rem" /></td>
              <td><input v-model="editForm.name" class="input" style="padding: 0.3rem" /></td>
              <td><input v-model="editForm.description" class="input" style="padding: 0.3rem" /></td>
              <td><input v-model.number="editForm.lowStockThreshold" type="number" min="0" class="input" style="padding: 0.3rem" /></td>
              <td>
                <div class="row" style="gap: 0.25rem">
                  <button class="btn btn-sm btn-primary" @click="saveItem(item.id)">Save</button>
                  <button class="btn btn-sm" @click="editingId = null">Cancel</button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else class="muted">Loading…</div>
</template>
