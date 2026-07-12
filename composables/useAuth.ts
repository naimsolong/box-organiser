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
   * Kicks off Google OAuth. Better Auth's signIn.social redirects the browser
   * to Google's consent page, then back to /api/auth/callback/google, which
   * sets the session cookie and lands the user on the dashboard.
   *
   * `callbackURL` is where Google sends the user after a successful sign-in.
   * Better Auth handles the redirect itself — we just need to navigate here.
   */
  async function signInWithGoogle(callbackURL = '/') {
    await $fetch('/api/auth/sign-in/social', {
      method: 'POST',
      body: { provider: 'google', callbackURL },
    })
  }

  async function logout() {
    try {
      await $fetch('/api/auth/sign-out', { method: 'POST' })
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
