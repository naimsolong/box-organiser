import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'

/**
 * Returns a Drizzle instance bound to the Cloudflare D1 `DB` binding.
 * The binding is available on `event.context.cloudflare.env` in both
 * local development (Nitro's Cloudflare dev emulation) and production.
 */
export function useDb(event: H3Event) {
  const env = (event.context as any).cloudflare?.env

  if (!env?.DB) {
    throw createError({
      statusCode: 500,
      statusMessage: 'D1 binding "DB" is not available. Check wrangler.jsonc and run `npm run db:migrate:local`.',
    })
  }

  return drizzle(env.DB)
}
