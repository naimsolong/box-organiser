import { eq, sql } from 'drizzle-orm'
import { warehouseInvitations } from '~~/server/database/schema'

/** Revoke a pending invitation. Owner-only. */
export default defineEventHandler(async (event) => {
  const token = String(getRouterParam(event, 'token') ?? '')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Invalid token' })

  const db = useDb(event)
  const [inv] = await db.select().from(warehouseInvitations).where(eq(warehouseInvitations.token, token)).all()
  if (!inv) throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  if (inv.acceptedAt) {
    throw createError({ statusCode: 410, statusMessage: 'Cannot revoke a used invitation' })
  }

  await requireWarehouseRole(event, inv.warehouseId, 'owner')

  await db
    .update(warehouseInvitations)
    .set({ revokedAt: sql`(unixepoch())` })
    .where(eq(warehouseInvitations.id, inv.id))
    .run()

  return { success: true }
})
