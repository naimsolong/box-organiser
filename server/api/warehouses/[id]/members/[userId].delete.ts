import { and, eq, sql } from 'drizzle-orm'
import { warehouseMembers } from '~~/server/database/schema'

/**
 * Remove a member from a warehouse.
 * - Owners can remove anyone except the last owner.
 * - Members can remove themselves (leave the warehouse).
 */
export default defineEventHandler(async (event) => {
  const warehouseId = Number(getRouterParam(event, 'id'))
  const targetUserId = String(getRouterParam(event, 'userId') ?? '')
  if (!warehouseId || !targetUserId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const user = await requireUser(event)
  const db = useDb(event)

  // Self-leave path: any member can leave.
  if (targetUserId === user.id) {
    const [m] = await db
      .select()
      .from(warehouseMembers)
      .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.userId, user.id)))
      .all()
    if (!m) throw createError({ statusCode: 404, statusMessage: 'Membership not found' })
    if (m.role === 'owner') {
      const owners = await db
        .select({ c: sql<number>`count(*)` })
        .from(warehouseMembers)
        .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.role, 'owner')))
        .all()
      if ((owners[0]?.c ?? 0) <= 1) {
        throw createError({ statusCode: 400, statusMessage: 'Cannot leave as the last owner' })
      }
    }
    await db
      .delete(warehouseMembers)
      .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.userId, user.id)))
      .run()
    return { success: true }
  }

  // Owner-removes-someone path.
  const me = await requireWarehouseRole(event, warehouseId, 'owner')
  void me

  const [target] = await db
    .select()
    .from(warehouseMembers)
    .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.userId, targetUserId)))
    .all()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  if (target.role === 'owner') {
    const owners = await db
      .select({ c: sql<number>`count(*)` })
      .from(warehouseMembers)
      .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.role, 'owner')))
      .all()
    if ((owners[0]?.c ?? 0) <= 1) {
      throw createError({ statusCode: 400, statusMessage: 'Cannot remove the last owner' })
    }
  }
  await db
    .delete(warehouseMembers)
    .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.userId, targetUserId)))
    .run()
  return { success: true }
})
