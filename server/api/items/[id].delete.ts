import { eq } from 'drizzle-orm'
import { items } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb(event)
  const [item] = await db.select().from(items).where(eq(items.id, id)).all()
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Item not found' })
  await requireBoxAccess(event, item.boxId, 'edit')

  await db.delete(items).where(eq(items.id, id))
  return { success: true }
})
