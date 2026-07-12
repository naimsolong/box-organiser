import { eq } from 'drizzle-orm'
import { user, warehouseMembers } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  await requireWarehouseMember(event, id)

  const db = useDb(event)
  const rows = await db
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

  return rows
})
