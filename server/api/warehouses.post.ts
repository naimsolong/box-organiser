import { eq } from 'drizzle-orm'
import { warehouses, warehouseMembers } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ name?: string; description?: string | null }>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: 'name is required' })
  if (name.length > 120) throw createError({ statusCode: 400, statusMessage: 'name is too long' })

  const db = useDb(event)

  // Insert warehouse, then membership in the same handler. SQLite/D1 doesn't
  // guarantee a transaction here, but this is a fresh warehouse so the worst
  // case is a warehouse with no owner member — which is unrecoverable, so
  // we delete the warehouse row if the membership insert fails.
  const [created] = await db
    .insert(warehouses)
    .values({
      name,
      description: body?.description ?? null,
      createdByUserId: user.id,
    })
    .returning()

  if (!created) throw createError({ statusCode: 500, statusMessage: 'Failed to create warehouse' })

  try {
    await db.insert(warehouseMembers).values({
      warehouseId: created.id,
      userId: user.id,
      role: 'owner',
      invitedByUserId: user.id,
    })
  } catch (err) {
    await db.delete(warehouses).where(eq(warehouses.id, created.id))
    throw err
  }

  return { ...created, role: 'owner' as const }
})
