# Warehouses — Implementation Plan

Introduce a **warehouse** primitive that groups boxes and the people who manage
them. The model is additive: a user with no warehouses keeps their existing
single-user flow unchanged. Joining a warehouse is opt-in, and a box can move
between personal and warehouse scope freely.

## Decisions locked (from clarification)

| Area | Decision |
|------|----------|
| Box ownership inside a shared warehouse | **Stays the original creator**. `ownerId` is the audit field; access is gated by warehouse membership. |
| Role set | **`owner` / `editor` / `viewer`** per warehouse. |
| Invites for emails not registered | **Pending-invitation table with secure tokens**. The link is shareable. |
| Migration of existing data | **No backfill.** Existing boxes stay personal (`warehouseId = NULL`); users opt in by creating a warehouse. |
| Deleting a warehouse | **Soft delete** — boxes revert to personal, members removed, the warehouse is hidden. |

## Why this is the smallest useful change

- **No data backfill at launch.** Personal inventory is unchanged.
- **No destructive change to the box schema.** A new nullable FK; the existing
  `ownerId` stays as the creator/audit field.
- **Public QR codes keep working.** A `shareCode` is the same cross-tenant
  read handle as before; the public response now includes warehouse info if
  applicable.
- **Every existing endpoint gets a one-line change.** The `eq(boxes.ownerId, user.id)`
  predicate is replaced with `accessibleBoxCondition(event)` (or
  `requireBoxAccess(event, id, 'view' | 'edit')`).

## Data model

### New tables

**`warehouses`** — singular, matches Better Auth convention.
```
id              integer PK autoincrement
name            text not null
description     text nullable
createdByUserId text not null FK user.id cascade
archivedAt      integer nullable            -- soft delete marker
createdAt       integer timestamp
updatedAt       integer timestamp
```

**`warehouse_members`** — join table with role.
```
id              integer PK autoincrement
warehouseId     integer not null FK warehouses.id cascade
userId          text not null FK user.id cascade
role            text not null               -- 'owner' | 'editor' | 'viewer'
invitedByUserId text nullable FK user.id set null
joinedAt        integer timestamp
unique (warehouseId, userId)
index  (userId)
```

**`warehouse_invitations`** — pending invites.
```
id              integer PK autoincrement
warehouseId     integer not null FK warehouses.id cascade
email           text not null
role            text not null               -- 'editor' | 'viewer' (owner can't be invited)
token           text not null unique
invitedByUserId text not null FK user.id cascade
expiresAt       integer timestamp not null  -- default +7 days
acceptedAt      integer timestamp nullable
revokedAt       integer timestamp nullable
createdAt       integer timestamp
index (email), index (warehouseId)
```

### Existing table changes

**`boxes`** — add a nullable FK. No data backfill.
```
warehouseId     integer nullable FK warehouses.id ON DELETE SET NULL
```

**`items`** — unchanged. Access flows through the parent box.

### Enum strategy

SQLite has no native enums. We use TypeScript union types in `schema.ts`
(`'owner' | 'editor' | 'viewer'`), zod-style validation at the API boundary,
and `roleAtLeast()` for the hierarchy check. The schema's `role` column is a
plain `text`; bad values are caught by the API layer, not the database.

## Authorization model

Helpers in `server/utils/access.ts`:

```
getWarehouseRole(event, warehouseId)              -> 'owner' | 'editor' | 'viewer' | null
requireWarehouseMember(event, warehouseId)        -> Membership (throws 401/403/404)
requireWarehouseRole(event, warehouseId, min)     -> Membership (throws if below min)
requireBoxAccess(event, boxId, 'view' | 'edit')   -> Box
accessibleBoxCondition(event)                     -> SQL predicate for list queries
getMyAccessibleWarehouseIds(event)                -> number[]
canMoveBox(event, box)                            -> boolean
```

### Rules

- **View box** — `box.ownerId === user.id` OR member of `box.warehouseId` (any role). Personal boxes (warehouseId NULL) are visible only to their owner.
- **Edit box / items / QR** — same as view, plus the warehouse role is `editor` or `owner`. Personal boxes editable only by their owner.
- **Manage members / invites** — warehouse role is `owner`.
- **Rename / delete warehouse** — `owner` only.
- **Last-owner protection** — cannot remove or demote the last `owner` of a warehouse. Cannot leave a warehouse you're the last owner of.

## Invite flow

1. Owner: `POST /api/warehouses/:id/invitations { email, role }`
   - Validates caller is `owner`.
   - Validates email + role (`editor` or `viewer`).
   - Refuses if a user with that email is already a member.
   - Revokes any prior pending invite for the same email+warehouse.
   - Generates a 32-byte token, stores it with `expiresAt = now + 7 days`.
   - Returns the invite URL. In dev, the link is also logged to the console.
2. Anyone: `GET /api/invitations/:token` (public)
   - Returns warehouse name, inviter, role, expiry. 404/410 for invalid/used/expired/revoked.
3. Logged-in user: `POST /api/invitations/:token/accept`
   - Requires authenticated user. The user's email must match the invite email (case-insensitive).
   - Idempotent: if already a member, returns the existing membership.
   - On success, creates the membership and marks `acceptedAt` on the invitation.
4. Owner: `DELETE /api/invitations/:token` (revoke)
   - Sets `revokedAt`. Cannot revoke a used invitation.

The invite page (`/invite/:token`) is public. If the user is not logged in, it
shows "Log in or Register" buttons that redirect to `/login?redirect=/invite/...`.

## API surface

### New endpoints

```
GET    /api/warehouses                          list my warehouses
POST   /api/warehouses                          create (creator becomes owner)
GET    /api/warehouses/:id                      detail + members + counts
PATCH  /api/warehouses/:id                      rename / description (owner)
DELETE /api/warehouses/:id                      soft delete (owner)
GET    /api/warehouses/:id/members              list members
GET    /api/warehouses/:id/invitations          list pending invites (owner)
POST   /api/warehouses/:id/invitations          create invite (owner)
GET    /api/invitations/:token                  public invite view
POST   /api/invitations/:token/accept           accept (any logged-in user)
DELETE /api/invitations/:token                  revoke (owner)
POST   /api/boxes/:id/move                      { warehouseId | null } (editor+)
```

### Modified endpoints

Replaced the `ownerId` predicate with the new access helpers:
- `boxes.get.ts` — `accessibleBoxCondition(event)`. Optional `?warehouseId=` filter.
- `boxes.post.ts` — optional `warehouseId` in body; verifies editor+ in that warehouse.
- `boxes/[id].{get,patch,delete}.ts` — `requireBoxAccess(event, id, ...)`.
- `boxes/[id]/regenerate-qr.post.ts` — `requireBoxAccess(..., 'edit')`.
- `boxes/[id]/items.{get,post}.ts` — `requireBoxAccess(..., 'view' | 'edit')`.
- `items/[id].{patch,delete}.ts` — resolve via parent box.
- `public/boxes/[shareCode].get.ts` — **no change** to auth; response now includes
  `warehouse: { id, name }` if the box is in a non-archived warehouse.

## UI

### New pages

- `pages/warehouses/index.vue` — list of warehouses the user belongs to, with a "New warehouse" button. Shows the personal box count.
- `pages/warehouses/new.vue` — create form.
- `pages/warehouses/[id]/index.vue` — detail with tabs: **Boxes** / **Members** / **Settings**.
  - Boxes tab: filtered box list (reuses the box list pattern, scoped).
  - Members tab: members with role badges, role-change/remove controls (owner only). Invite form + pending invites table (owner only).
  - Settings tab: rename/description form + "Delete warehouse" (owner only).
- `pages/invite/[token].vue` — public invite view. If logged in with a matching email, "Accept". If logged in with a different email, "Log out" + warning. If not logged in, "Log in" / "Register" buttons that preserve the redirect.

### Updated pages

- `pages/index.vue` (dashboard) — added scope tabs: All / Personal / each warehouse. The "New box" link preserves the active warehouse.
- `pages/boxes/new.vue` — optional warehouse selector in the create form (only warehouses the user is `editor+` in). Pre-fills from `?warehouseId=` query.
- `pages/boxes/[id].vue` — shows the warehouse name (with link) or "Personal" badge. "Move…" action to change warehouse.
- `pages/b/[shareCode].vue` (public) — shows the warehouse name if applicable.
- `pages/login.vue` / `pages/register.vue` — accept `?redirect=...` and honor it.

### New layout

- `layouts/default.vue` — top bar with brand, nav (Boxes / Warehouses / Labels / Scan), user email, and logout button. Auto-hides for logged-out users.
- `components/NavBar.vue` — the top-bar nav links.

### Middleware

- `middleware/auth.global.ts` — `/invite/*` added to the public route list. All warehouse access checks live in endpoints.

## Migration

Generated by `npm run db:generate` as `drizzle/migrations/0001_*.sql`. The
migration:

1. Creates `warehouses`, `warehouse_members`, `warehouse_invitations`.
2. Adds `boxes.warehouse_id` (nullable) with a `REFERENCES warehouses(id) ON DELETE SET NULL`.
3. Adds a `CREATE INDEX` for `boxes(warehouse_id)`.

**No data backfill.** Existing rows keep `warehouse_id = NULL` and remain
personal. Users opt in by creating their first warehouse.

Apply locally with `npm run db:migrate:local` and remotely with
`npm run db:migrate:remote` (or the standard `wrangler d1 migrations apply`).

## Verification checklist

- [ ] Personal user with no warehouses: dashboard, box CRUD, QR, labels, scan all work unchanged.
- [ ] Create warehouse → creator is `owner`, can rename and delete.
- [ ] Invite: admin enters email → link returned → invitee logs in with that email → accept → becomes `editor`/`viewer`.
- [ ] Editor: full CRUD on boxes in the warehouse, can rotate QR, can move boxes.
- [ ] Viewer: can list and view boxes; cannot edit, move, or rotate QR.
- [ ] Non-member: gets 404 on warehouse-scoped routes; public QR link still works.
- [ ] Remove member: immediately loses access on next request.
- [ ] Soft-delete warehouse: `archivedAt` set, boxes revert to personal, members removed, public QR links still resolve.
- [ ] Last owner cannot be removed or demoted.
- [ ] Invitation token is single-use, expires after 7 days, can be revoked.
- [ ] Accepting an invite with mismatched email returns 403.
- [ ] Public `/b/{shareCode}` route includes warehouse info when applicable.

## Out of scope (v1)

- Email delivery for invites (current: link shown in UI + logged in dev).
- Transfer-ownership flow.
- Pending-invite cleanup job.
- Per-warehouse structured locations / categories.
- Warehouse-level audit log.
- Per-box "members only" toggle.
