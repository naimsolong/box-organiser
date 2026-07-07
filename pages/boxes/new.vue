<script setup lang="ts">
const form = reactive({ name: '', location: '', category: '', status: 'active' })
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
    const created = await $fetch<{ id: number }>('/api/boxes', {
      method: 'POST',
      body: {
        name: form.name,
        location: form.location || null,
        category: form.category || null,
        status: form.status,
      },
    })
    await navigateTo(`/boxes/${created.id}`)
  } catch (e: any) {
    err.value = e?.statusMessage || 'Failed to create box'
  } finally {
    loading.value = false
  }
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
      <p v-if="err" class="badge badge-warn">{{ err }}</p>
      <div class="row">
        <button class="btn btn-primary" type="submit" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create box' }}
        </button>
        <NuxtLink to="/boxes" class="btn">Cancel</NuxtLink>
      </div>
      <p class="muted">A QR code will be generated automatically.</p>
    </form>
  </div>
</template>
