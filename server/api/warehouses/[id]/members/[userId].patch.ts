import { and, eq } from 'drizzle-orm'
import { INVITABLE_ROLES, warehouseMembers, type WarehouseRole } from '~~/server/database/schema'

/**
 * Change a member's role. Owner-only.
 * - Cannot demote yourself if you are the last owner.
 * - Cannot promote anyone to 'owner' here (use transfer-ownership flow, future).
 */
export default defineEventHandler(async (event) => {
  const warehouseId = Number(getRouterParam(event, 'id'))
  const targetUserId = String(getRouterParam(event, 'userId') ?? '')
  if (!warehouseId || !targetUserId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const me = await requireWarehouseRole(event, warehouseId, 'owner')

  const body = await readBody<{ role?: string }>(event)
  const role = body?.role as WarehouseRole | undefined
  if (!role || !INVITABLE_ROLES.includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'role must be editor or viewer' })
  }

  const db = useDb(event)
  const [target] = await db
    .select()
    .from(warehouseMembers)
    .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.userId, targetUserId)))
    .all()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Member not found' })

  // Prevent demoting the last owner.
  if (target.role === 'owner' && role !== 'owner') {
    const owners = await db
      .select({ userId: warehouseMembers.userId })
      .from(warehouseMembers)
      .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.role, 'owner')))
      .all()
    if (owners.length <= 1) {
      throw createError({ statusCode: 400, statusMessage: 'Cannot demote the last owner' })
    }
    // Allow self-demotion only if there is at least one other owner.
    if (targetUserId === me.userId && owners.length < 2) {
      throw createError({ statusCode: 400, statusMessage: 'Cannot demote the last owner' })
    }
  }

  const [updated] = await db
    .update(warehouseMembers)
    .set({ role })
    .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.userId, targetUserId)))
    .returning()

  return updated
})
