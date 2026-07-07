<script setup lang="ts">
interface Box {
  id: number
  name: string
  location: string | null
  category: string | null
  createdAt: string
}

const { data: boxes, refresh } = await useFetch<Box[]>('/api/boxes')

const form = reactive({ name: '', location: '', category: '' })
const submitting = ref(false)

async function addBox() {
  if (!form.name) return
  submitting.value = true
  try {
    await $fetch('/api/boxes', {
      method: 'POST',
      body: {
        name: form.name,
        location: form.location || null,
        category: form.category || null,
      },
    })
    form.name = ''
    form.location = ''
    form.category = ''
    await refresh()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1>Box Organiser</h1>
    <p class="subtitle">Nuxt + Cloudflare D1</p>

    <form class="form" @submit.prevent="addBox">
      <input v-model="form.name" placeholder="Box name *" required />
      <input v-model="form.location" placeholder="Location" />
      <input v-model="form.category" placeholder="Category" />
      <button type="submit" :disabled="submitting">Add box</button>
    </form>

    <ul class="boxes">
      <li v-for="box in boxes" :key="box.id">
        <strong>{{ box.name }}</strong>
        <span v-if="box.location"> · {{ box.location }}</span>
        <span v-if="box.category"> · {{ box.category }}</span>
      </li>
      <li v-if="!boxes?.length" class="empty">No boxes yet — add one above.</li>
    </ul>
  </div>
</template>

<style>
body {
  font-family: system-ui, sans-serif;
  background: #f6f7f9;
  margin: 0;
}
.container {
  max-width: 560px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
h1 {
  margin-bottom: 0.25rem;
}
.subtitle {
  color: #6b7280;
  margin-top: 0;
}
.form {
  display: grid;
  gap: 0.5rem;
  margin: 1.5rem 0;
}
.form input {
  padding: 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
}
.form button {
  padding: 0.6rem 1rem;
  border: 0;
  border-radius: 8px;
  background: #111827;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}
.form button:disabled {
  opacity: 0.6;
}
.boxes {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}
.boxes li {
  background: #fff;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.empty {
  color: #6b7280;
}
</style>
