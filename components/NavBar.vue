<script setup lang="ts">
const route = useRoute()

const links = computed(() => [
  { to: '/', label: 'Boxes' },
  { to: '/warehouses', label: 'Warehouses' },
  { to: '/labels', label: 'Labels' },
  { to: '/scan', label: 'Scan' },
])

function isActive(to: string) {
  if (to === '/') return route.path === '/' || route.path.startsWith('/boxes')
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <nav class="row" style="gap: 0.25rem">
    <NuxtLink
      v-for="l in links"
      :key="l.to"
      :to="l.to"
      class="navlink"
      :class="{ active: isActive(l.to) }"
    >
      {{ l.label }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.navlink {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  font-size: 0.95rem;
}
.navlink:hover {
  background: #f3f4f6;
}
.navlink.active {
  background: #eef2ff;
  color: #4338ca;
  font-weight: 500;
}
</style>
