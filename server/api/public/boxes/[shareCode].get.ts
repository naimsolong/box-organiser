import { eq } from 'drizzle-orm'
import { boxes, items } from '~~/server/database/schema'

// Public, read-only box view reachable by scanning the QR code. No auth.
export default defineEventHandler(async (event) => {
  const shareCode = getRouterParam(event, 'shareCode')
  if (!shareCode) throw createError({ statusCode: 400, statusMessage: 'Invalid code' })

  const db = useDb(event)
  const [box] = await db.select().from(boxes).where(eq(boxes.shareCode, shareCode)).all()
  if (!box) throw createError({ statusCode: 404, statusMessage: 'Box not found' })

  const boxItems = await db.select().from(items).where(eq(items.boxId, box.id)).all()
  return {
    name: box.name,
    location: box.location,
    category: box.category,
    status: box.status,
    items: boxItems.map((it) => ({
      name: it.name,
      description: it.description,
      quantity: it.quantity,
    })),
  }
})
