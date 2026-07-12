<script setup lang="ts">
definePageMeta({ layout: 'default' })

const form = reactive({ name: '', description: '' })
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
    const created = await $fetch<{ id: number }>('/api/warehouses', {
      method: 'POST',
      body: {
        name: form.name,
        description: form.description || null,
      },
    })
    const { setCurrent } = useWarehouses()
    setCurrent(created.id)
    await navigateTo(`/warehouses/${created.id}`)
  } catch (e: any) {
    err.value = e?.statusMessage || e?.data?.message || 'Failed to create warehouse'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/warehouses" class="muted">← Back to warehouses</NuxtLink>
    <h1 style="margin-top: 0.5rem">New warehouse</h1>

    <form class="card grid" style="max-width: 480px" @submit.prevent="submit">
      <div>
        <label>Name *</label>
        <input v-model="form.name" class="input" required placeholder="e.g. Main warehouse" />
      </div>
      <div>
        <label>Description</label>
        <textarea v-model="form.description" class="input" rows="3" placeholder="Optional notes about this warehouse" />
      </div>
      <p v-if="err" class="badge badge-warn">{{ err }}</p>
      <div class="row">
        <button class="btn btn-primary" type="submit" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create warehouse' }}
        </button>
        <NuxtLink to="/warehouses" class="btn">Cancel</NuxtLink>
      </div>
      <p class="muted">You'll be the owner. Invite editors and viewers from the warehouse page.</p>
    </form>
  </div>
</template>
