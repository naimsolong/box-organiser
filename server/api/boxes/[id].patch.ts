import { eq } from 'drizzle-orm'
import { boxes } from '~~/server/database/schema'
import type { NewBox } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  await requireBoxAccess(event, id, 'edit')

  const body = await readBody<Partial<Pick<NewBox, 'name' | 'location' | 'category' | 'status'>>>(event)
  const db = useDb(event)

  const [updated] = await db
    .update(boxes)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.status !== undefined && { status: body.status }),
    })
    .where(eq(boxes.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Box not found' })
  return updated
})
