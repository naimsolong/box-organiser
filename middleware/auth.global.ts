export default defineNuxtRouteMiddleware(async (to) => {
  const isPublic =
    to.path === '/login' ||
    to.path === '/register' ||
    to.path.startsWith('/b/') ||
    to.path === '/scan' ||
    to.path.startsWith('/invite/')

  if (isPublic) return

  const { session, fetched, fetchSession } = useAuth()
  if (!fetched.value) await fetchSession()
  if (!session.value) return navigateTo('/login')
})
