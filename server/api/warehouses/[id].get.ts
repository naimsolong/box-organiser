import { eq, sql } from 'drizzle-orm'
import { boxes, user, warehouseMembers, warehouses } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  const membership = await requireWarehouseMember(event, id)

  const db = useDb(event)
  const [w] = await db.select().from(warehouses).where(eq(warehouses.id, id)).all()
  if (!w || w.archivedAt) throw createError({ statusCode: 404, statusMessage: 'Warehouse not found' })

  const [boxCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(boxes)
    .where(eq(boxes.warehouseId, id))
    .all()

  const members = await db
    .select({
      userId: warehouseMembers.userId,
      role: warehouseMembers.role,
      joinedAt: warehouseMembers.joinedAt,
      invitedByUserId: warehouseMembers.invitedByUserId,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(warehouseMembers)
    .innerJoin(user, eq(user.id, warehouseMembers.userId))
    .where(eq(warehouseMembers.warehouseId, id))
    .all()

  return {
    id: w.id,
    name: w.name,
    description: w.description,
    createdAt: w.createdAt,
    createdByUserId: w.createdByUserId,
    role: membership.role,
    boxCount: boxCount?.c ?? 0,
    members: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      invitedByUserId: m.invitedByUserId,
      name: m.name,
      email: m.email,
      image: m.image,
    })),
  }
})
