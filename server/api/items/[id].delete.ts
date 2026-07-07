import { and, eq } from 'drizzle-orm'
import { boxes, items } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb(event)
  const [item] = await db.select().from(items).where(eq(items.id, id)).all()
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Item not found' })

  const [box] = await db
    .select()
    .from(boxes)
    .where(and(eq(boxes.id, item.boxId), eq(boxes.ownerId, user.id)))
    .all()
  if (!box) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  await db.delete(items).where(eq(items.id, id))
  return { success: true }
})
