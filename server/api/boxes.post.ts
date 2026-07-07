import { nanoid } from 'nanoid'
import { boxes } from '~~/server/database/schema'
import type { NewBox } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<Pick<NewBox, 'name' | 'location' | 'category' | 'status'>>(event)

  if (!body?.name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const db = useDb(event)
  const [created] = await db
    .insert(boxes)
    .values({
      ownerId: user.id,
      name: body.name,
      location: body.location ?? null,
      category: body.category ?? null,
      status: body.status ?? 'active',
      shareCode: nanoid(16),
    })
    .returning()

  return created
})
