import { eq, sql } from 'drizzle-orm'
import { boxes, warehouseMembers, warehouses } from '~~/server/database/schema'

/**
 * Soft-delete a warehouse. Boxes revert to personal (warehouseId = NULL),
 * members are removed, the warehouse is hidden. QR codes still resolve.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  await requireWarehouseRole(event, id, 'owner')

  const db = useDb(event)
  const [w] = await db.select().from(warehouses).where(eq(warehouses.id, id)).all()
  if (!w) throw createError({ statusCode: 404, statusMessage: 'Warehouse not found' })
  if (w.archivedAt) return { success: true, alreadyArchived: true }

  // 1) Detach boxes (warehouseId = NULL) — keeps them visible to their ownerId.
  await db.update(boxes).set({ warehouseId: null }).where(eq(boxes.warehouseId, id)).run()
  // 2) Remove memberships.
  await db.delete(warehouseMembers).where(eq(warehouseMembers.warehouseId, id)).run()
  // 3) Mark warehouse as archived.
  await db
    .update(warehouses)
    .set({ archivedAt: sql`(unixepoch())` })
    .where(eq(warehouses.id, id))
    .run()

  return { success: true }
})
