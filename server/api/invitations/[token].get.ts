import { eq, sql } from 'drizzle-orm'
import { user, warehouseInvitations, warehouses } from '~~/server/database/schema'

/** Public view of an invitation. Does not require auth. */
export default defineEventHandler(async (event) => {
  const token = String(getRouterParam(event, 'token') ?? '')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Invalid token' })

  const db = useDb(event)
  const [row] = await db
    .select({
      id: warehouseInvitations.id,
      email: warehouseInvitations.email,
      role: warehouseInvitations.role,
      expiresAt: warehouseInvitations.expiresAt,
      acceptedAt: warehouseInvitations.acceptedAt,
      revokedAt: warehouseInvitations.revokedAt,
      warehouseId: warehouseInvitations.warehouseId,
      warehouseName: warehouses.name,
      inviterName: user.name,
    })
    .from(warehouseInvitations)
    .innerJoin(warehouses, eq(warehouses.id, warehouseInvitations.warehouseId))
    .leftJoin(user, eq(user.id, warehouseInvitations.invitedByUserId))
    .where(eq(warehouseInvitations.token, token))
    .all()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  if (row.acceptedAt) {
    throw createError({ statusCode: 410, statusMessage: 'This invitation has already been used' })
  }
  if (row.revokedAt) {
    throw createError({ statusCode: 410, statusMessage: 'This invitation has been revoked' })
  }
  const now = Math.floor(Date.now() / 1000)
  if (row.expiresAt instanceof Date) {
    if (Math.floor(row.expiresAt.getTime() / 1000) < now) {
      throw createError({ statusCode: 410, statusMessage: 'This invitation has expired' })
    }
  }

  return {
    email: row.email,
    role: row.role,
    expiresAt: row.expiresAt,
    warehouseId: row.warehouseId,
    warehouseName: row.warehouseName,
    inviterName: row.inviterName,
  }
})
