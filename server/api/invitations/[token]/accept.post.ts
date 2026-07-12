import { and, eq, isNull, sql } from 'drizzle-orm'
import { warehouseInvitations, warehouseMembers } from '~~/server/database/schema'

/**
 * Accept an invitation. Requires authentication (the user's email must match
 * the invitation email). On success, a warehouse_members row is created.
 */
export default defineEventHandler(async (event) => {
  const token = String(getRouterParam(event, 'token') ?? '')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Invalid token' })

  const user = await requireUser(event)
  const db = useDb(event)

  const [inv] = await db
    .select()
    .from(warehouseInvitations)
    .where(eq(warehouseInvitations.token, token))
    .all()
  if (!inv) throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  if (inv.acceptedAt) {
    throw createError({ statusCode: 410, statusMessage: 'This invitation has already been used' })
  }
  if (inv.revokedAt) {
    throw createError({ statusCode: 410, statusMessage: 'This invitation has been revoked' })
  }
  const nowSec = Math.floor(Date.now() / 1000)
  const expiresAtSec = inv.expiresAt instanceof Date ? Math.floor(inv.expiresAt.getTime() / 1000) : Number(inv.expiresAt)
  if (expiresAtSec < nowSec) {
    throw createError({ statusCode: 410, statusMessage: 'This invitation has expired' })
  }

  if (inv.email.toLowerCase() !== user.email.toLowerCase()) {
    throw createError({ statusCode: 403, statusMessage: 'This invitation was sent to a different email' })
  }

  // Idempotent: if already a member, just return the membership.
  const [existing] = await db
    .select()
    .from(warehouseMembers)
    .where(and(eq(warehouseMembers.warehouseId, inv.warehouseId), eq(warehouseMembers.userId, user.id)))
    .all()
  if (existing) {
    return { warehouseId: inv.warehouseId, role: existing.role, alreadyMember: true }
  }

  await db.insert(warehouseMembers).values({
    warehouseId: inv.warehouseId,
    userId: user.id,
    role: inv.role,
    invitedByUserId: inv.invitedByUserId,
  })

  await db
    .update(warehouseInvitations)
    .set({ acceptedAt: sql`(unixepoch())` })
    .where(eq(warehouseInvitations.id, inv.id))
    .run()

  return { warehouseId: inv.warehouseId, role: inv.role }
})
