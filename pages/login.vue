<script setup lang="ts">
const { login } = useAuth()
const email = ref('')
const password = ref('')
const err = ref('')
const loading = ref(false)

async function submit() {
  err.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    await navigateTo('/')
  } catch (e: any) {
    err.value = e?.statusMessage || e?.data?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1>Log in</h1>
    <p class="muted">Box Organiser</p>
    <form class="grid" @submit.prevent="submit">
      <div>
        <label>Email</label>
        <input v-model="email" type="email" class="input" required autocomplete="email" />
      </div>
      <div>
        <label>Password</label>
        <input v-model="password" type="password" class="input" required autocomplete="current-password" />
      </div>
      <p v-if="err" class="badge badge-warn">{{ err }}</p>
      <button class="btn btn-primary" type="submit" :disabled="loading">
        {{ loading ? 'Logging in…' : 'Log in' }}
      </button>
      <p class="muted">
        No account? <NuxtLink to="/register">Register</NuxtLink>
      </p>
    </form>
  </div>
</template>
