import { eq } from 'drizzle-orm'
import { items } from '~~/server/database/schema'
import type { NewItem } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  await requireBoxAccess(event, id, 'edit')

  const body = await readBody<Pick<NewItem, 'name' | 'description' | 'quantity' | 'lowStockThreshold'>>(event)
  if (!body?.name) throw createError({ statusCode: 400, statusMessage: 'name is required' })

  const db = useDb(event)
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
