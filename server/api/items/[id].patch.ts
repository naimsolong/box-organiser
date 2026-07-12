import { eq } from 'drizzle-orm'
import { boxes, items } from '~~/server/database/schema'
import type { NewItem } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb(event)
  const [item] = await db.select().from(items).where(eq(items.id, id)).all()
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Item not found' })
  // Access check via parent box.
  await requireBoxAccess(event, item.boxId, 'edit')

  const body = await readBody<Partial<Pick<NewItem, 'name' | 'description' | 'quantity' | 'lowStockThreshold'>>>(event)
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
