<script setup lang="ts">
definePageMeta({ layout: 'default' })

interface BoxRow {
  id: number
  name: string
  location: string | null
  category: string | null
  status: string
  shareCode: string
  itemCount: number
  lowStockCount: number
}

const { data: boxes } = await useFetch<BoxRow[]>('/api/boxes')
const { toQrDataUrl, shareUrl } = useQr()
const { exportLabelSheet } = usePdf()

const selected = ref<Record<number, boolean>>({})
const opts = reactive({ pageSize: 'a4' as 'a4' | 'letter', labelMm: 40, gapMm: 5 })
const generating = ref(false)

const selectedBoxes = computed(() => (boxes.value ?? []).filter((b) => selected.value[b.id]))

async function generate() {
  if (selectedBoxes.value.length === 0) return
  generating.value = true
  try {
    const entries = await Promise.all(
      selectedBoxes.value.map(async (b) => ({
        label: b.name,
        qr: await toQrDataUrl(shareUrl(b.shareCode), { width: 300 }),
      })),
    )
    await exportLabelSheet(entries, {
      pageSize: opts.pageSize,
      labelMm: opts.labelMm,
      gapMm: opts.gapMm,
    })
  } finally {
    generating.value = false
  }
}

function selectAll() {
  for (const b of boxes.value ?? []) selected.value[b.id] = true
}
function clearAll() {
  selected.value = {}
}
</script>

<template>
  <div>
    <h1>Label sheet</h1>
    <p class="muted">Select boxes and print a sheet of QR labels (A4 or Letter).</p>

    <div class="card grid" style="margin: 1rem 0">
      <div class="row">
        <label>Page</label>
        <select v-model="opts.pageSize" class="select" style="max-width: 120px">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
        <label>Label size (mm)</label>
        <input v-model.number="opts.labelMm" type="number" min="20" max="80" class="input" style="max-width: 90px" />
        <label>Gap (mm)</label>
        <input v-model.number="opts.gapMm" type="number" min="0" max="20" class="input" style="max-width: 70px" />
      </div>
      <div class="row">
        <button class="btn btn-sm" @click="selectAll">Select all</button>
        <button class="btn btn-sm" @click="clearAll">Clear</button>
        <button class="btn btn-primary btn-sm" :disabled="selectedBoxes.length === 0 || generating" @click="generate">
          {{ generating ? 'Generating…' : `Generate PDF (${selectedBoxes.length})` }}
        </button>
      </div>
    </div>

    <p v-if="!boxes?.length" class="muted">No boxes available.</p>
    <div class="grid">
      <label v-for="box in boxes" :key="box.id" class="card row" style="gap: 0.5rem">
        <input v-model="selected[box.id]" type="checkbox" />
        <span><strong>{{ box.name }}</strong> <span class="muted">· {{ box.itemCount }} items</span></span>
      </label>
    </div>
  </div>
</template>
