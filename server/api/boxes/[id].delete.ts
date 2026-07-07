import { and, eq } from 'drizzle-orm'
import { boxes, items } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb(event)

  // Confirm ownership before deleting.
  const [box] = await db
    .select()
    .from(boxes)
    .where(and(eq(boxes.id, id), eq(boxes.ownerId, user.id)))
    .all()
  if (!box) throw createError({ statusCode: 404, statusMessage: 'Box not found' })

  // Delete items explicitly (don't rely on D1 FK cascade being enforced).
  await db.delete(items).where(eq(items.boxId, id))
  await db.delete(boxes).where(eq(boxes.id, id))

  return { success: true }
})
