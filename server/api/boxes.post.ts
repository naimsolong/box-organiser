import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import {
  boxes,
  warehouseMembers,
  roleAtLeast,
  type NewBox,
  type WarehouseRole,
} from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<
    Pick<NewBox, 'name' | 'location' | 'category' | 'status'> & { warehouseId?: number | null }
  >(event)

  if (!body?.name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  let warehouseId: number | null = null
  if (body.warehouseId != null) {
    warehouseId = Number(body.warehouseId)
    if (!Number.isFinite(warehouseId)) {
      throw createError({ statusCode: 400, statusMessage: 'warehouseId must be a number' })
    }
    const db = useDb(event)
    const [m] = await db
      .select({ role: warehouseMembers.role })
      .from(warehouseMembers)
      .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.userId, user.id)))
      .all()
    if (!m || !roleAtLeast(m.role as WarehouseRole, 'editor')) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  const db = useDb(event)
  const [created] = await db
    .insert(boxes)
    .values({
      ownerId: user.id,
      warehouseId,
      name: body.name,
      location: body.location ?? null,
      category: body.category ?? null,
      status: body.status ?? 'active',
      shareCode: nanoid(16),
    })
    .returning()

  return created
})
