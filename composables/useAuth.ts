export function useAuth() {
  const session = useState<{ user: { id: string; name: string; email: string; image?: string | null } } | null>(
    'auth:session',
    () => null,
  )
  const fetched = useState<boolean>('auth:fetched', () => false)

  async function fetchSession() {
    try {
      session.value = await $fetch('/api/auth/session')
    } catch {
      session.value = null
    }
    fetched.value = true
  }

  async function login(email: string, password: string) {
    await $fetch('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
    await fetchSession()
  }

  async function register(name: string, email: string, password: string) {
    await $fetch('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
    await fetchSession()
  }

  async function logout() {
    try {
      await $fetch('/api/auth/sign-out', { method: 'POST' })
    } finally {
      session.value = null
      fetched.value = true
    }
  }

  return { session, fetched, fetchSession, login, register, logout }
}
