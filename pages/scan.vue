<script setup lang="ts">
import type { Html5Qrcode } from 'html5-qrcode'

const readerEl = ref<HTMLElement | null>(null)
const status = ref('Starting camera…')
const error = ref('')
const manualCode = ref('')
let scanner: Html5Qrcode | null = null

onMounted(async () => {
  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    if (!readerEl.value) return
    scanner = new Html5Qrcode('qr-reader')
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decoded: string) => onDecode(decoded),
      () => {},
    )
    status.value = 'Point the camera at a box QR code'
  } catch (e: any) {
    error.value = 'Could not access camera: ' + (e?.message || 'permission denied')
    status.value = ''
  }
})

onBeforeUnmount(async () => {
  try {
    if (scanner) {
      await scanner.stop()
      await scanner.clear()
    }
  } catch {
    // ignore
  }
})

function onDecode(decoded: string) {
  // Accept either a full URL (.../b/CODE) or a bare code.
  const match = decoded.match(/\/b\/([A-Za-z0-9_-]+)/)
  const code = match ? match[1] : decoded.trim()
  if (scanner) scanner.stop()
  navigateTo(`/b/${code}`)
}
</script>

<template>
  <div style="max-width: 420px; margin: 0 auto">
    <h1>Scan a box</h1>
    <div id="qr-reader" ref="readerEl" style="width: 100%; border-radius: 12px; overflow: hidden"></div>
    <p class="muted" style="text-align: center; margin-top: 0.75rem">{{ status }}</p>
    <p v-if="error" class="badge badge-warn">{{ error }}</p>
    <p class="muted" style="text-align: center; margin-top: 1rem">Or enter a code manually:</p>
    <form class="row" style="gap: 0.5rem" @submit.prevent="navigateTo('/b/' + manualCode)">
      <input v-model="manualCode" class="input" placeholder="Box code" />
      <button class="btn btn-primary btn-sm" type="submit">Open</button>
    </form>
  </div>
</template>
