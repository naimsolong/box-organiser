<script setup lang="ts">
const route = useRoute()
const shareCode = route.params.shareCode as string

const { data: box, error } = await useFetch<{
  name: string
  location: string | null
  category: string | null
  status: string
  warehouse: { id: number; name: string } | null
  items: { name: string; description: string | null; quantity: number }[]
}>(`/api/public/boxes/${shareCode}`)
</script>

<template>
  <div style="max-width: 560px; margin: 1rem auto">
    <div v-if="error" class="card" style="text-align: center">
      <h1>Box not found</h1>
      <p class="muted">This QR code may have been regenerated or the box deleted.</p>
    </div>
    <div v-else-if="box" class="grid">
      <div class="card">
        <h1>{{ box.name }}</h1>
        <p class="muted">
          <span v-if="box.location">📍 {{ box.location }}</span>
          <span v-if="box.category"> · 🏷️ {{ box.category }}</span>
        </p>
        <div class="row" style="gap: 0.4rem; flex-wrap: wrap">
          <span class="badge">{{ box.status }}</span>
          <span v-if="box.warehouse" class="badge">🏬 {{ box.warehouse.name }}</span>
        </div>
      </div>

      <div class="card">
        <h2>Contents ({{ box.items.length }})</h2>
        <table v-if="box.items.length">
          <thead>
            <tr>
              <th style="width: 50px">Qty</th>
              <th>Item</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in box.items" :key="i">
              <td>{{ item.quantity }}</td>
              <td>{{ item.name }}</td>
              <td class="muted">{{ item.description }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">This box is empty.</p>
      </div>
    </div>
  </div>
</template>
