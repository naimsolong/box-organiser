<script setup lang="ts">
const { session, logout } = useAuth()
const route = useRoute()
const router = useRouter()

async function doLogout() {
  await logout()
  // Force a full reload so the auth middleware re-evaluates and the
  // top bar disappears (avoids stale `useState` on the layout).
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  } else {
    await router.push('/login')
  }
}
</script>

<template>
  <div>
    <header v-if="session" class="topbar">
      <div class="container row" style="justify-content: space-between; align-items: center; gap: 1rem">
        <div class="row" style="gap: 1rem; align-items: center">
          <NuxtLink to="/" class="brand">📦 Box Organiser</NuxtLink>
          <NavBar />
        </div>
        <div class="row" style="gap: 0.5rem; align-items: center">
          <span class="muted" style="font-size: 0.9rem">{{ session.user.email }}</span>
          <button class="btn btn-sm" @click="doLogout">Log out</button>
        </div>
      </div>
    </header>
    <main class="container">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.topbar {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0.6rem 0;
  margin-bottom: 1.5rem;
}
.brand {
  font-weight: 600;
  text-decoration: none;
  color: inherit;
}
</style>
