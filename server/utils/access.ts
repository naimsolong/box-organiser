import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import type { H3Event } from 'h3'
import {
  boxes,
  warehouseMembers,
  warehouses,
  type Box,
  type Warehouse,
  type WarehouseMember,
  type WarehouseRole,
} from '~~/server/database/schema'
import { roleAtLeast } from '~~/server/database/schema'

/**
 * Authorization helpers for the warehouse/membership/box model.
 *
 * Access rules:
 *   - A user can VIEW a box if they are the box's owner OR a member of the box's
 *     warehouse (any role). A box with warehouseId = NULL is owned-only.
 *   - A user can EDIT a box under the same condition PLUS the warehouse role is
 *     'editor' or 'owner'. Boxes with warehouseId = NULL are editable only by
 *     the owner.
 *   - Warehouse-level operations (rename, delete, invite, remove member) require
 *     a minimum role on the target warehouse, checked via requireWarehouseRole.
 */

export async function getWarehouseRole(event: H3Event, warehouseId: number): Promise<WarehouseRole | null> {
  const user = await requireUser(event)
  const db = useDb(event)
  const [m] = await db
    .select({ role: warehouseMembers.role })
    .from(warehouseMembers)
    .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.userId, user.id)))
    .all()
  return (m?.role as WarehouseRole | undefined) ?? null
}

/** Throws 401/403/404. Returns the membership row. */
export async function requireWarehouseMember(event: H3Event, warehouseId: number): Promise<WarehouseMember> {
  const user = await requireUser(event)
  const db = useDb(event)
  const [m] = await db
    .select()
    .from(warehouseMembers)
    .where(and(eq(warehouseMembers.warehouseId, warehouseId), eq(warehouseMembers.userId, user.id)))
    .all()
  if (!m) {
    // 404 if the warehouse itself doesn't exist, 403 if it does but the user isn't a member.
    const [w] = await db.select().from(warehouses).where(eq(warehouses.id, warehouseId)).all()
    if (!w || w.archivedAt) throw createError({ statusCode: 404, statusMessage: 'Warehouse not found' })
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return m
}

/** Throws 401/403/404. Returns the membership row. */
export async function requireWarehouseRole(
  event: H3Event,
  warehouseId: number,
  minRole: WarehouseRole,
): Promise<WarehouseMember> {
  const m = await requireWarehouseMember(event, warehouseId)
  if (!roleAtLeast(m.role as WarehouseRole, minRole)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return m
}

/** Returns the warehouse row, or throws 404. Does NOT check membership. */
export async function getWarehouseOr404(event: H3Event, warehouseId: number): Promise<Warehouse> {
  const db = useDb(event)
  const [w] = await db.select().from(warehouses).where(eq(warehouses.id, warehouseId)).all()
  if (!w || w.archivedAt) throw createError({ statusCode: 404, statusMessage: 'Warehouse not found' })
  return w
}

/**
 * Loads a box and verifies the current user can interact with it.
 * - mode 'view' allows any member (or the box owner).
 * - mode 'edit' requires editor+ membership in the box's warehouse, or owner-only
 *   for personal boxes (warehouseId = NULL).
 */
export async function requireBoxAccess(
  event: H3Event,
  boxId: number,
  mode: 'view' | 'edit',
): Promise<Box> {
  const user = await requireUser(event)
  const db = useDb(event)
  const [box] = await db.select().from(boxes).where(eq(boxes.id, boxId)).all()
  if (!box) throw createError({ statusCode: 404, statusMessage: 'Box not found' })

  // Personal box (no warehouse). Only the owner can interact.
  if (box.warehouseId == null) {
    if (box.ownerId !== user.id) {
      throw createError({ statusCode: 404, statusMessage: 'Box not found' })
    }
    return box
  }

  const role = await getWarehouseRole(event, box.warehouseId)
  if (!role) throw createError({ statusCode: 404, statusMessage: 'Box not found' })

  if (mode === 'view') {
    // Any role can view (incl. viewer). Box owner can also view even if not a member.
    if (box.ownerId !== user.id && !roleAtLeast(role, 'viewer')) {
      throw createError({ statusCode: 404, statusMessage: 'Box not found' })
    }
  } else {
    if (!roleAtLeast(role, 'editor')) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }
  return box
}

/** Returns the IDs of warehouses the user is a member of. */
export async function getMyAccessibleWarehouseIds(event: H3Event): Promise<number[]> {
  const user = await requireUser(event)
  const db = useDb(event)
  const rows = await db
    .select({ id: warehouseMembers.warehouseId })
    .from(warehouseMembers)
    .where(eq(warehouseMembers.userId, user.id))
    .all()
  return rows.map((r) => r.id)
}

/** Returns the set of warehouse IDs the user owns. */
export async function getMyOwnedWarehouseIds(event: H3Event): Promise<number[]> {
  const user = await requireUser(event)
  const db = useDb(event)
  const rows = await db
    .select({ id: warehouseMembers.warehouseId })
    .from(warehouseMembers)
    .where(and(eq(warehouseMembers.userId, user.id), eq(warehouseMembers.role, 'owner')))
    .all()
  return rows.map((r) => r.id)
}

/**
 * Builds a SQL condition that matches all boxes a user can VIEW:
 *   box.ownerId = user.id  OR  box.warehouseId IN (user's accessible warehouses)
 */
export async function accessibleBoxCondition(event: H3Event) {
  const user = await requireUser(event)
  const warehouseIds = await getMyAccessibleWarehouseIds(event)
  if (warehouseIds.length === 0) {
    return eq(boxes.ownerId, user.id)
  }
  return or(eq(boxes.ownerId, user.id), inArray(boxes.warehouseId, warehouseIds))!
}

/** True if the user can edit (move/change warehouse on) the given box. */
export async function canMoveBox(event: H3Event, box: Box): Promise<boolean> {
  if (box.warehouseId == null) {
    // Personal box — only the owner can move it.
    const user = await requireUser(event)
    return box.ownerId === user.id
  }
  const role = await getWarehouseRole(event, box.warehouseId)
  return roleAtLeast(role, 'editor')
}
