import { toWebRequest } from 'h3'
import { getAuth } from '~/server/utils/auth'

// Better Auth catch-all: handles /sign-up/email, /sign-in/email, /sign-out, etc.
export default defineEventHandler(async (event) => {
  const auth = getAuth(event)
  return auth.handler(toWebRequest(event))
})
