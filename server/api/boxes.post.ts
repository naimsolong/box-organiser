import { boxes } from '../database/schema'
import type { NewBox } from '../database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<Pick<NewBox, 'name' | 'location' | 'category'>>(event)

  if (!body?.name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const db = useDb(event)
  const [created] = await db
    .insert(boxes)
    .values({
      name: body.name,
      location: body.location ?? null,
      category: body.category ?? null,
    })
    .returning()

  return created
})
