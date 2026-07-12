import { eq } from 'drizzle-orm'
import { boxes, items } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  await requireBoxAccess(event, id, 'edit')

  const db = useDb(event)
  // Delete items explicitly (don't rely on D1 FK cascade being enforced).
  await db.delete(items).where(eq(items.boxId, id))
  await db.delete(boxes).where(eq(boxes.id, id))

  return { success: true }
})
