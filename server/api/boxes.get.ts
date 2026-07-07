import { and, eq, inArray, like, sql } from 'drizzle-orm'
import { boxes, items } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  const { q, status, category, location } = getQuery(event)

  const conditions = [eq(boxes.ownerId, user.id)]
  if (status) conditions.push(eq(boxes.status, String(status)))
  if (category) conditions.push(eq(boxes.category, String(category)))
  if (location) conditions.push(eq(boxes.location, String(location)))
  if (q) conditions.push(like(boxes.name, `%${String(q)}%`))

  const list = await db.select().from(boxes).where(and(...conditions)).all()

  if (list.length === 0) return []

  const boxIds = list.map((b) => b.id)
  const counts = await db
    .select({
      boxId: items.boxId,
      itemCount: sql<number>`count(*)`,
      lowStockCount: sql<number>`coalesce(sum(case when ${items.lowStockThreshold} is not null and ${items.quantity} <= ${items.lowStockThreshold} then 1 else 0 end), 0)`,
    })
    .from(items)
    .where(inArray(items.boxId, boxIds))
    .groupBy(items.boxId)
    .all()

  const countsMap = new Map(counts.map((c) => [c.boxId, c]))
  return list.map((b) => ({
    ...b,
    itemCount: countsMap.get(b.id)?.itemCount ?? 0,
    lowStockCount: countsMap.get(b.id)?.lowStockCount ?? 0,
  }))
})
