<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data, refresh } = await useAsyncData('warehouses:list', () => $fetch('/api/warehouses'))

const { setCurrent } = useWarehouses()

function openWarehouse(id: number) {
  setCurrent(id)
  return navigateTo(`/warehouses/${id}`)
}
</script>

<template>
  <div>
    <div class="row" style="justify-content: space-between">
      <h1>Warehouses</h1>
      <NuxtLink to="/warehouses/new" class="btn btn-primary">+ New warehouse</NuxtLink>
    </div>

    <p v-if="(data?.personalBoxCount ?? 0) > 0" class="muted">
      You have <strong>{{ data?.personalBoxCount }}</strong> personal box{{ data?.personalBoxCount === 1 ? '' : 'es' }}
      (not in any warehouse).
      <NuxtLink to="/">Go to your boxes →</NuxtLink>
    </p>

    <p v-if="!data?.warehouses.length" class="muted">
      You're not in any warehouses yet. Create one to start sharing inventory with a team.
    </p>

    <div class="grid" style="margin-top: 1rem">
      <button
        v-for="w in data?.warehouses ?? []"
        :key="w.id"
        class="card"
        style="text-align: left; cursor: pointer; background: #fff; border: 1px solid #e5e7eb"
        @click="openWarehouse(w.id)"
      >
        <div class="row" style="justify-content: space-between">
          <strong>{{ w.name }}</strong>
          <span class="badge">{{ w.role }}</span>
        </div>
        <p v-if="w.description" class="muted" style="margin: 0.35rem 0">{{ w.description }}</p>
        <div class="row" style="gap: 0.4rem; margin-top: 0.5rem">
          <span class="badge">{{ w.boxCount }} box{{ w.boxCount === 1 ? '' : 'es' }}</span>
          <span class="badge">{{ w.memberCount }} member{{ w.memberCount === 1 ? '' : 's' }}</span>
        </div>
      </button>
    </div>
  </div>
</template>
