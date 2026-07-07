import { and, eq } from 'drizzle-orm'
import { boxes, items } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb(event)
  const [box] = await db
    .select()
    .from(boxes)
    .where(and(eq(boxes.id, id), eq(boxes.ownerId, user.id)))
    .all()

  if (!box) throw createError({ statusCode: 404, statusMessage: 'Box not found' })

  const boxItems = await db.select().from(items).where(eq(items.boxId, id)).all()
  return { ...box, items: boxItems }
})
