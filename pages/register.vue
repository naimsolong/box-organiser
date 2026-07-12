<script setup lang="ts">
const { register } = useAuth()

// Only show this page in dev (email/password is local-only).
const { data: mode } = await useFetch<{ providers: ('email' | 'google')[] }>('/api/auth/mode')
if (!mode.value?.providers.includes('email')) {
  await navigateTo('/login')
}

const route = useRoute()
const redirect = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') ? r : '/'
})

const name = ref('')
const email = ref('')
const password = ref('')
const err = ref('')
const loading = ref(false)

async function submit() {
  err.value = ''
  if (password.value.length < 8) {
    err.value = 'Password must be at least 8 characters'
    return
  }
  loading.value = true
  try {
    await register(name.value, email.value, password.value)
    await navigateTo(redirect.value)
  } catch (e: any) {
    err.value = e?.statusMessage || e?.data?.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1>Register</h1>
    <p class="muted">Box Organiser</p>
    <form class="grid" @submit.prevent="submit">
      <div>
        <label>Name</label>
        <input v-model="name" class="input" required />
      </div>
      <div>
        <label>Email</label>
        <input v-model="email" type="email" class="input" required autocomplete="email" />
      </div>
      <div>
        <label>Password (min 8 chars)</label>
        <input v-model="password" type="password" class="input" required autocomplete="new-password" />
      </div>
      <p v-if="err" class="badge badge-warn">{{ err }}</p>
      <button class="btn btn-primary" type="submit" :disabled="loading">
        {{ loading ? 'Creating…' : 'Create account' }}
      </button>
      <p class="muted">
        Already have an account? <NuxtLink to="/login">Log in</NuxtLink>
      </p>
    </form>
  </div>
</template>
