import { getAuthSession } from '~/server/utils/auth'

// Convenience endpoint used by the client to read the current session reactively.
export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session) return null
  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    expiresAt: session.session.expiresAt,
  }
})
