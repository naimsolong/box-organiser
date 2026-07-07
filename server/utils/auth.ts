import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from '~~/server/database/schema'

/**
 * Build a Better Auth instance for the current request.
 *
 * On Cloudflare Workers, configuration is exposed via the request's env bindings
 * (not `process.env`), so the auth instance — and its Drizzle/D1 adapter — must
 * be constructed per request from `event.context.cloudflare.env`.
 */
export function getAuth(event: H3Event) {
  const env = (event.context as any).cloudflare?.env

  if (!env?.DB) {
    throw createError({ statusCode: 500, statusMessage: 'D1 binding "DB" is not available.' })
  }

  const baseURL = env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  return betterAuth({
    baseURL,
    secret: env.BETTER_AUTH_SECRET || 'dev-secret-change-me',
    trustedOrigins: [baseURL, 'http://localhost:3000'],
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: true },
  })
}

// Renamed from getSession to avoid clashing with h3's built-in getSession export.
export async function getAuthSession(event: H3Event) {
  return await getAuth(event).api.getSession({ headers: event.headers })
}

/** Returns the authenticated user or throws 401. */
export async function requireUser(event: H3Event) {
  const session = await getAuthSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return session.user
}
