import { and, eq } from 'drizzle-orm'
import { items, warehouseMembers, warehouses } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  const box = await requireBoxAccess(event, id, 'view')

  const user = await requireUser(event)
  const db = useDb(event)

  let warehouse: { id: number; name: string; role: string } | null = null
  if (box.warehouseId != null) {
    const [w] = await db.select().from(warehouses).where(eq(warehouses.id, box.warehouseId)).all()
    if (w) {
      const [m] = await db
        .select({ role: warehouseMembers.role })
        .from(warehouseMembers)
        .where(and(eq(warehouseMembers.warehouseId, w.id), eq(warehouseMembers.userId, user.id)))
        .all()
      warehouse = { id: w.id, name: w.name, role: m?.role ?? 'member' }
    }
  }

  const boxItems = await db.select().from(items).where(eq(items.boxId, id)).all()
  return { ...box, items: boxItems, warehouse }
})
