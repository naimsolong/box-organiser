import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// ----------------------------------------------------------------------------
// Better Auth tables (match better-auth defaults — singular table names).
// Regenerable via: npx @better-auth/cli generate
// ----------------------------------------------------------------------------
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
})

// ----------------------------------------------------------------------------
// Warehouses
// A warehouse is a shared container of boxes. Boxes belong to a warehouse
// (or stay personal with warehouseId = NULL). Memberships carry a role
// ('owner' | 'editor' | 'viewer') that controls access to boxes and to
// the membership roster itself.
// ----------------------------------------------------------------------------
export const warehouses = sqliteTable('warehouses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
})

export const warehouseMembers = sqliteTable(
  'warehouse_members',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'owner' | 'editor' | 'viewer'
    invitedByUserId: text('invited_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('warehouse_members_unique').on(t.warehouseId, t.userId),
    index('warehouse_members_user_idx').on(t.userId),
  ],
)

export const warehouseInvitations = sqliteTable(
  'warehouse_invitations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull(), // 'editor' | 'viewer' (owner can never be invited)
    token: text('token').notNull().unique(),
    invitedByUserId: text('invited_by_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index('warehouse_invitations_email_idx').on(t.email),
    index('warehouse_invitations_warehouse_idx').on(t.warehouseId),
  ],
)

// ----------------------------------------------------------------------------
// App tables
// ----------------------------------------------------------------------------
export const boxes = sqliteTable('boxes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  warehouseId: integer('warehouse_id').references(() => warehouses.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  location: text('location'),
  category: text('category'),
  status: text('status').notNull().default('active'), // active | sealed | archived
  shareCode: text('share_code').notNull().unique(), // rotatable QR identifier
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
})

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  boxId: integer('box_id').notNull().references(() => boxes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  quantity: integer('quantity').notNull().default(1),
  lowStockThreshold: integer('low_stock_threshold'), // null = no alert
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
})

export type User = typeof user.$inferSelect
export type Box = typeof boxes.$inferSelect
export type NewBox = typeof boxes.$inferInsert
export type Item = typeof items.$inferSelect
export type NewItem = typeof items.$inferInsert
export type Warehouse = typeof warehouses.$inferSelect
export type NewWarehouse = typeof warehouses.$inferInsert
export type WarehouseMember = typeof warehouseMembers.$inferSelect
export type NewWarehouseMember = typeof warehouseMembers.$inferInsert
export type WarehouseInvitation = typeof warehouseInvitations.$inferSelect
export type NewWarehouseInvitation = typeof warehouseInvitations.$inferInsert

export type WarehouseRole = 'owner' | 'editor' | 'viewer'
export const WAREHOUSE_ROLES: readonly WarehouseRole[] = ['owner', 'editor', 'viewer'] as const
export const INVITABLE_ROLES: readonly WarehouseRole[] = ['editor', 'viewer'] as const

export const ROLE_RANK: Record<WarehouseRole, number> = { viewer: 1, editor: 2, owner: 3 }

export function roleAtLeast(actual: WarehouseRole | null | undefined, required: WarehouseRole): boolean {
  if (!actual) return false
  return ROLE_RANK[actual] >= ROLE_RANK[required]
}
