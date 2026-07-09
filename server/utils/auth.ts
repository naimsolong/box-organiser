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
 *
 * Auth mode is selected by environment:
 *   - Local dev  (baseURL is localhost) -> email + password.
 *   - Production (baseURL is the prod domain) -> Google SSO only.
 * Detection uses baseURL instead of NODE_ENV because NODE_ENV is always
 * "production" inside a Worker bundle.
 */
export function getAuth(event: H3Event) {
  const env = (event.context as any).cloudflare?.env

  if (!env?.DB) {
    throw createError({ statusCode: 500, statusMessage: 'D1 binding "DB" is not available.' })
  }

  const baseURL = env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const isDev = baseURL.includes('localhost') || baseURL.includes('127.0.0.1')

  if (!env.NUXT_PUBLIC_SITE_URL && !isDev) {
    console.warn('[auth] NUXT_PUBLIC_SITE_URL is not set; defaulting to localhost. Set it in production to enable Google SSO.')
  }

  const config: Record<string, unknown> = {
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
  }

  if (isDev) {
    // Local: fast iteration, no Google setup needed.
    config.emailAndPassword = { enabled: true }
  } else {
    // Production: Google SSO only.
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw createError({
        statusCode: 500,
        statusMessage: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in production. Set them with `wrangler secret put`.',
      })
    }
    config.socialProviders = {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    }
  }

  return betterAuth(config as Parameters<typeof betterAuth>[0])
}

/** Returns the list of enabled sign-in providers for the current request. */
export function getAuthProviders(event: H3Event): ('email' | 'google')[] {
  const env = (event.context as any).cloudflare?.env
  const baseURL = env?.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const isDev = baseURL.includes('localhost') || baseURL.includes('127.0.0.1')
  return isDev ? ['email'] : ['google']
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
