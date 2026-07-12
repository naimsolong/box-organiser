import { and, eq, isNull, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import {
  INVITABLE_ROLES,
  warehouseInvitations,
  warehouseMembers,
  type WarehouseRole,
} from '~~/server/database/schema'

const INVITE_TTL_DAYS = 7

export default defineEventHandler(async (event) => {
  const warehouseId = Number(getRouterParam(event, 'id'))
  if (!warehouseId) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  const me = await requireWarehouseRole(event, warehouseId, 'owner')

  const body = await readBody<{ email?: string; role?: string }>(event)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const role = body?.role as WarehouseRole | undefined
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }
  if (!role || !INVITABLE_ROLES.includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'role must be editor or viewer' })
  }

  const db = useDb(event)

  // Block re-inviting an existing member of THIS warehouse.
  const [existing] = await db
    .select({ id: warehouseMembers.id })
    .from(warehouseMembers)
    .innerJoin(sql`user`, sql`user.id = ${warehouseMembers.userId}`)
    .where(sql`${warehouseMembers.warehouseId} = ${warehouseId} and lower(user.email) = ${email}`)
    .all()
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'That user is already a member of this warehouse' })
  }

  // Revoke any active (non-accepted, non-revoked) invite for the same email+warehouse.
  await db
    .update(warehouseInvitations)
    .set({ revokedAt: sql`(unixepoch())` })
    .where(
      and(
        eq(warehouseInvitations.warehouseId, warehouseId),
        eq(sql`lower(${warehouseInvitations.email})`, email),
        isNull(warehouseInvitations.acceptedAt),
        isNull(warehouseInvitations.revokedAt),
      ),
    )
    .run()

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  const token = nanoid(32)

  const [created] = await db
    .insert(warehouseInvitations)
    .values({
      warehouseId,
      email,
      role,
      token,
      invitedByUserId: me.userId,
      expiresAt,
    })
    .returning()

  // In dev, the UI shows the link. Email delivery is a v1.1 item.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[invite] ${email} -> /invite/${token} (warehouse ${warehouseId}, role ${role})`)
  }

  return { ...created, inviteUrl: `/invite/${token}` }
})
