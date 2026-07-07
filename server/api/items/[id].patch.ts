import { and, eq } from 'drizzle-orm'
import { boxes, items } from '~~/server/database/schema'
import type { NewItem } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const body = await readBody<Partial<Pick<NewItem, 'name' | 'description' | 'quantity' | 'lowStockThreshold'>>>(event)
  const db = useDb(event)

  // Verify ownership via the item's box.
  const [item] = await db.select().from(items).where(eq(items.id, id)).all()
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Item not found' })

  const [box] = await db
    .select()
    .from(boxes)
    .where(and(eq(boxes.id, item.boxId), eq(boxes.ownerId, user.id)))
    .all()
  if (!box) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const [updated] = await db
    .update(items)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.lowStockThreshold !== undefined && { lowStockThreshold: body.lowStockThreshold }),
    })
    .where(eq(items.id, id))
    .returning()

  return updated
})
