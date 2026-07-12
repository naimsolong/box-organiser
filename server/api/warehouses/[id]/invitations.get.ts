import { and, eq, isNull, sql } from 'drizzle-orm'
import { user, warehouseInvitations, warehouses } from '~~/server/database/schema'

/** List pending (non-accepted, non-revoked, non-expired) invites. Owner-only. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  await requireWarehouseRole(event, id, 'owner')

  const db = useDb(event)
  const rows = await db
    .select({
      id: warehouseInvitations.id,
      email: warehouseInvitations.email,
      role: warehouseInvitations.role,
      token: warehouseInvitations.token,
      expiresAt: warehouseInvitations.expiresAt,
      createdAt: warehouseInvitations.createdAt,
      invitedByName: user.name,
    })
    .from(warehouseInvitations)
    .leftJoin(user, eq(user.id, warehouseInvitations.invitedByUserId))
    .where(
      and(
        eq(warehouseInvitations.warehouseId, id),
        isNull(warehouseInvitations.acceptedAt),
        isNull(warehouseInvitations.revokedAt),
        sql`${warehouseInvitations.expiresAt} > unixepoch()`,
      ),
    )
    .all()

  const [w] = await db.select({ name: warehouses.name }).from(warehouses).where(eq(warehouses.id, id)).all()

  return {
    warehouseName: w?.name ?? null,
    invitations: rows.map((r) => ({ ...r, inviteUrl: `/invite/${r.token}` })),
  }
})
