import { eq, isNull, sql } from 'drizzle-orm'
import { boxes, warehouseMembers, warehouses } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)

  // Warehouses the user is a member of, excluding archived ones.
  const rows = await db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      description: warehouses.description,
      role: warehouseMembers.role,
      createdAt: warehouses.createdAt,
      archivedAt: warehouses.archivedAt,
      memberCount: sql<number>`(select count(*) from ${warehouseMembers} wm2 where wm2.warehouse_id = ${warehouses.id})`,
      boxCount: sql<number>`(select count(*) from ${boxes} b where b.warehouse_id = ${warehouses.id})`,
    })
    .from(warehouses)
    .innerJoin(warehouseMembers, eq(warehouseMembers.warehouseId, warehouses.id))
    .where(eq(warehouseMembers.userId, user.id))
    .all()

  // Personal box count (warehouseId IS NULL, owned by user).
  const [personal] = await db
    .select({ count: sql<number>`count(*)` })
    .from(boxes)
    .where(sql`${boxes.ownerId} = ${user.id} and ${boxes.warehouseId} is null`)
    .all()

  return {
    personalBoxCount: personal?.count ?? 0,
    warehouses: rows.filter((w) => !w.archivedAt).map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      role: w.role,
      createdAt: w.createdAt,
      memberCount: w.memberCount,
      boxCount: w.boxCount,
    })),
  }
})
