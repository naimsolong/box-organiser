import { and, eq } from 'drizzle-orm'
import {
  boxes,
  roleAtLeast,
  warehouseMembers,
  type WarehouseRole,
} from '~~/server/database/schema'

/**
 * Move a box to a different warehouse (or to personal, with warehouseId = null).
 * Editing the box's own warehouse: requires editor+ in the SOURCE warehouse
 * (verified by requireBoxAccess). The destination warehouse requires editor+
 * in the destination, OR null for personal (and box ownerId == user.id).
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  const box = await requireBoxAccess(event, id, 'edit')

  const body = await readBody<{ warehouseId?: number | null }>(event)
  const dest = body?.warehouseId ?? null
  if (dest === box.warehouseId) return box

  const user = await requireUser(event)
  const db = useDb(event)

  if (dest == null) {
    // Moving to personal is only allowed for the original creator.
    if (box.ownerId !== user.id) {
      throw createError({ statusCode: 403, statusMessage: 'Only the box owner can move it to personal' })
    }
  } else {
    if (!Number.isFinite(dest)) {
      throw createError({ statusCode: 400, statusMessage: 'warehouseId must be a number or null' })
    }
    const [m] = await db
      .select({ role: warehouseMembers.role })
      .from(warehouseMembers)
      .where(and(eq(warehouseMembers.warehouseId, dest), eq(warehouseMembers.userId, user.id)))
      .all()
    if (!m || !roleAtLeast(m.role as WarehouseRole, 'editor')) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  const [updated] = await db.update(boxes).set({ warehouseId: dest }).where(eq(boxes.id, id)).returning()
  return updated
})
