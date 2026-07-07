import { boxes } from '../database/schema'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  return await db.select().from(boxes).all()
})
