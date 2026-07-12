import { eq } from 'drizzle-orm'
import { items } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  await requireBoxAccess(event, id, 'view')

  const db = useDb(event)
  return await db.select().from(items).where(eq(items.boxId, id)).all()
})
