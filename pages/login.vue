<script setup lang="ts">
const { login, signInWithGoogle } = useAuth()

const { data: mode } = await useFetch<{ providers: ('email' | 'google')[] }>('/api/auth/mode')
const providers = computed(() => mode.value?.providers ?? [])

const route = useRoute()
const redirect = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') ? r : '/'
})

const email = ref('')
const password = ref('')
const err = ref('')
const loading = ref(false)

async function submit() {
  err.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    await navigateTo(redirect.value)
  } catch (e: any) {
    err.value = e?.statusMessage || e?.data?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

async function doGoogle() {
  err.value = ''
  loading.value = true
  try {
    await signInWithGoogle(redirect.value)
  } catch (e: any) {
    err.value = e?.statusMessage || e?.data?.message || 'Google sign-in failed'
    loading.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1>Log in</h1>
    <p class="muted">Box Organiser</p>

    <div class="grid">
      <button
        v-if="providers.includes('google')"
        class="btn google"
        type="button"
        :disabled="loading"
        @click="doGoogle"
      >
        <span class="g-mark">G</span>
        {{ loading ? 'Redirecting…' : 'Continue with Google' }}
      </button>

      <template v-if="providers.includes('email')">
        <div v-if="providers.includes('google')" class="divider"><span>or</span></div>

        <form class="grid login-form" @submit.prevent="submit">
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
      </template>
    </div>
  </div>
</template>

<style scoped>
.google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: #fff;
  border: 1px solid #d1d5db;
  font-weight: 500;
}
.google:hover {
  background: #f9fafb;
}
.g-mark {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  background: linear-gradient(45deg, #ea4335, #fbbc05 33%, #34a853 66%, #4285f4);
  color: #fff;
  font-weight: 700;
  border-radius: 4px;
  font-size: 0.8rem;
}
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #9ca3af;
  font-size: 0.8rem;
  margin: 0.25rem 0;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-top: 1px solid #e5e7eb;
}
.divider span {
  padding: 0 0.5rem;
}
@media (max-width: 640px) {
  .login-form .btn-primary {
    width: 100%;
  }
}
</style>
