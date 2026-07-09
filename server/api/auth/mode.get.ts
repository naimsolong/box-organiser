import { getAuthProviders } from '~~/server/utils/auth'

// Tells the client which sign-in providers are available in this environment.
//   dev  -> ['email']
//   prod -> ['google']
export default defineEventHandler((event) => {
  return { providers: getAuthProviders(event) }
})
