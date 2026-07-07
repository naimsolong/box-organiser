import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { boxes } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb(event)
  const [updated] = await db
    .update(boxes)
    .set({ shareCode: nanoid(16) })
    .where(and(eq(boxes.id, id), eq(boxes.ownerId, user.id)))
    .returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Box not found' })
  return updated
})
