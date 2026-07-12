<script setup lang="ts">
const route = useRoute()
const { session, logout } = useAuth()

const showNav = computed(
  () =>
    !['/login', '/register'].includes(route.path) &&
    !route.path.startsWith('/b/') &&
    !route.path.startsWith('/invite/'),
)

async function doLogout() {
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="app">
    <nav v-if="showNav" class="nav">
      <NuxtLink to="/" class="brand">Box Organiser</NuxtLink>
      <div class="links">
        <NuxtLink to="/">Boxes</NuxtLink>
        <NuxtLink to="/warehouses">Warehouses</NuxtLink>
        <NuxtLink to="/scan">Scan</NuxtLink>
        <NuxtLink to="/labels">Labels</NuxtLink>
      </div>
      <div class="right">
        <span v-if="session" class="who">{{ session.user.email }}</span>
        <button v-if="session" class="btn btn-sm" @click="doLogout">Logout</button>
      </div>
    </nav>
    <main class="main">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #f6f7f9;
  color: #111827;
}
a {
  color: inherit;
  text-decoration: none;
}
.nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: #111827;
  color: #fff;
}
.nav .brand {
  font-weight: 700;
  font-size: 1.1rem;
}
.nav .links {
  display: flex;
  gap: 1rem;
}
.nav .links a {
  opacity: 0.8;
}
.nav .links a.router-link-active {
  opacity: 1;
  border-bottom: 2px solid #fff;
}
.nav .right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.nav .who {
  opacity: 0.7;
  font-size: 0.85rem;
}
.main {
  max-width: 880px;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}
.container {
  max-width: 420px;
  margin: 4rem auto;
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem 1.25rem;
}
.grid {
  display: grid;
  gap: 0.75rem;
}
.row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}
.btn {
  padding: 0.55rem 0.9rem;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
}
.btn:hover {
  background: #f3f4f6;
}
.btn-primary {
  background: #111827;
  color: #fff;
  border-color: #111827;
}
.btn-primary:hover {
  background: #1f2937;
}
.btn-danger {
  color: #b91c1c;
  border-color: #fecaca;
}
.btn-danger:hover {
  background: #fef2f2;
}
.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}
.input,
.select {
  padding: 0.55rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  width: 100%;
}
label {
  font-size: 0.85rem;
  color: #4b5563;
}
.muted {
  color: #6b7280;
  font-size: 0.9rem;
}
.badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: #e5e7eb;
}
.badge-warn {
  background: #fee2e2;
  color: #b91c1c;
}
.badge-ok {
  background: #dcfce7;
  color: #15803d;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 0.5rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.9rem;
}
th {
  color: #6b7280;
  font-weight: 600;
}
h1,
h2 {
  margin: 0 0 0.25rem;
}
</style>
