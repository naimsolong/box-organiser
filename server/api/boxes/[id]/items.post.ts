import { and, eq } from 'drizzle-orm'
import { boxes, items } from '~~/server/database/schema'
import type { NewItem } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const body = await readBody<Pick<NewItem, 'name' | 'description' | 'quantity' | 'lowStockThreshold'>>(event)
  if (!body?.name) throw createError({ statusCode: 400, statusMessage: 'name is required' })

  const db = useDb(event)
  const [box] = await db
    .select()
    .from(boxes)
    .where(and(eq(boxes.id, id), eq(boxes.ownerId, user.id)))
    .all()

  if (!box) throw createError({ statusCode: 404, statusMessage: 'Box not found' })

  const [created] = await db
    .insert(items)
    .values({
      boxId: id,
      name: body.name,
      description: body.description ?? null,
      quantity: body.quantity ?? 1,
      lowStockThreshold: body.lowStockThreshold ?? null,
    })
    .returning()

  return created
})
