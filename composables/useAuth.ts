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

  /**
   * Kicks off Google OAuth. Better Auth's signIn.social returns a JSON body
   * `{ url: 'https://accounts.google.com/...' }` — it does NOT redirect the
   * browser itself. We must navigate to that URL manually, otherwise the
   * caller just sits on a "Redirecting…" button forever.
   *
   * `callbackURL` is where Google sends the user after a successful sign-in.
   */
  async function signInWithGoogle(callbackURL = '/') {
    const res = await $fetch<{ url?: string; redirect?: string }>('/api/auth/sign-in/social', {
      method: 'POST',
      body: { provider: 'google', callbackURL },
    })
    const target = res?.url || res?.redirect
    if (!target) {
      throw new Error('Google sign-in did not return a redirect URL')
    }
    if (typeof window !== 'undefined') {
      window.location.href = target
    } else {
      // SSR fallback: just return the URL so the caller can navigate.
      return target
    }
  }

  async function logout() {
    try {
      await $fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {},
      })
    } catch {
      // Even if the server call fails, clear local state so the UI updates.
    } finally {
      session.value = null
      fetched.value = true
      // Clear the warehouse cache too — next user starts fresh.
      try {
        const { reset } = useWarehouses()
        reset()
      } catch {
        // composable not available in some contexts; safe to ignore
      }
    }
  }

  return { session, fetched, fetchSession, login, register, signInWithGoogle, logout }
}
