import { eq } from 'drizzle-orm'
import { warehouses } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  await requireWarehouseRole(event, id, 'owner')

  const body = await readBody<{ name?: string; description?: string | null }>(event)
  const patch: Record<string, unknown> = {}
  if (body?.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) throw createError({ statusCode: 400, statusMessage: 'name cannot be empty' })
    if (name.length > 120) throw createError({ statusCode: 400, statusMessage: 'name is too long' })
    patch.name = name
  }
  if (body?.description !== undefined) {
    patch.description = body.description ?? null
  }
  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'no fields to update' })
  }

  const db = useDb(event)
  const [updated] = await db.update(warehouses).set(patch).where(eq(warehouses.id, id)).returning()
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Warehouse not found' })
  return updated
})
