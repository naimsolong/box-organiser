# Box Organiser

A multi-user inventory box manager built with **Nuxt + Cloudflare D1**. Each box
gets a QR code that links to a public, read-only view of its contents. The QR code
is **rotatable** (regenerating it invalidates old prints).

## Features

- **Multi-user auth** — login method depends on environment:
  - **Local dev** — email + password (no OAuth setup needed).
  - **Production** — Google SSO only.
- **Boxes** — create / edit / delete, with location, category, and status (active / sealed / archived).
- **Inventory items** — add / edit / delete items per box, with quantity and low-stock threshold.
- **QR codes** — auto-generated on box creation, encodes a public link `/b/{shareCode}`.
- **Regenerate QR** — rotates the share code so old QR prints stop working.
- **Export to PDF** (client-side jsPDF):
  - Single QR code with selectable size (40–100 mm).
  - Box manifest (header + QR + items table).
  - Bulk label sheet (A4 / Letter grid) from the **Labels** page.
- **Scan** — in-app camera scanner to open a box by its QR code.
- **Search & filter** — dashboard filters by name, status, category; per-box item counts and low-stock badges.
- **Public box view** — `/b/{shareCode}` is accessible without login (what the QR resolves to).
- **Warehouses** — group boxes into a shared inventory and invite teammates. Three roles per warehouse: **owner** (manages members + settings), **editor** (full box CRUD), **viewer** (read-only). Boxes can be moved between warehouses, or back to personal. Existing data is unaffected — boxes stay personal (`warehouseId = NULL`) until you create a warehouse. See [`docs/PLAN-warehouses.md`](docs/PLAN-warehouses.md).

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Nuxt (SPA mode, `cloudflare_module` preset) |
| Database | Cloudflare D1 (binding `DB`) |
| ORM | Drizzle ORM + drizzle-kit migrations |
| Auth | Better Auth (Drizzle adapter, per-request instance from Worker env) |
| QR | `qrcode` (client-side, image derived from share code — no blob storage) |
| PDF | `jspdf` (client-side — Cloudflare Workers can't run server-side PDF libs) |
| Scanner | `html5-qrcode` |

## Auth modes

The active sign-in method is chosen from `NUXT_PUBLIC_SITE_URL`:

| `NUXT_PUBLIC_SITE_URL` | Mode | UI shows |
|------------------------|------|----------|
| `http://localhost:3000` (or unset) | **Dev** | email + password login + register |
| `https://<prod-domain>` | **Prod** | "Continue with Google" only |

The rule lives in `server/utils/auth.ts` (`isDev = baseURL.includes('localhost')`).
We branch on `baseURL` rather than `NODE_ENV` because `NODE_ENV` is always
`"production"` inside a Worker bundle, which would silently disable the dev
login on the deployed app.

A small public endpoint `/api/auth/mode` returns `{ providers: ['email'] }` in
dev and `{ providers: ['google'] }` in prod, which the login page reads to
decide what to render.

## Prerequisites

- Node.js 20+
- A Cloudflare account (free tier works). Install and login:
  ```bash
  npx wrangler login
  ```

## Setup (local dev)

### 1. Install dependencies

```bash
npm install
```

> `package.json` declares deps as `latest`; the first install pins them in the lockfile. Feel free to replace `latest` with specific ranges afterward.

### 2. Create the D1 database

```bash
npm run db:create
```

This prints a `database_id`. Paste it into `wrangler.jsonc` (replace
`REPLACE_WITH_ID_FROM_wrangler_d1_create`).

### 3. Generate & apply the migration

```bash
npm run db:generate       # drizzle-kit generate -> drizzle/migrations/*.sql
npm run db:migrate:local  # apply to local D1 (used by `nuxt dev`)
```

### 4. Local secrets (`.dev.vars`, gitignored)

The dev secret and site URL live in `.dev.vars` (auto-loaded by Wrangler in dev,
gitignored). It should contain:

```env
NUXT_PUBLIC_SITE_URL=http://localhost:3000
BETTER_AUTH_SECRET=dev-secret-change-me
```

The default `.dev.vars` shipped in the repo is already gitignored. You should
**replace the dev `BETTER_AUTH_SECRET`** with a real value (`openssl rand -base64 32`)
if you care about local sessions being unguessable — the placeholder is fine for
hobbyist dev.

### 5. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000, register an account, and create a box.

## How QR codes work

- A box's QR encodes `{siteUrl}/b/{shareCode}`, where `shareCode` is a random
  16-char string stored in D1.
- The QR **image is never stored** — it's always regenerated client-side from the
  share code + URL. So D1 stays lean (no image blobs, no R2 needed).
- **Regenerate QR** = rotate `shareCode`. The old `/b/{oldCode}` link returns 404;
  the new QR resolves to the updated public view.
- `siteUrl` comes from `NUXT_PUBLIC_SITE_URL`. If empty, the app builds QR links
  from the request origin (fine when served from your production domain).

## Production deployment

### 1. Set Cloudflare secrets (env-mode is auto-selected by `NUXT_PUBLIC_SITE_URL`)

```bash
# Required in production
wrangler secret put NUXT_PUBLIC_SITE_URL          # e.g. https://box-organiser.<account>.workers.dev
wrangler secret put BETTER_AUTH_SECRET            # openssl rand -base64 32

# Required in production (Google SSO is the only sign-in method)
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

### 2. Configure the Google OAuth client (one-time, manual)

In https://console.cloud.google.com/ → **APIs & Services** → **Credentials**:

1. Create an OAuth client. **Application type: Web application**.
2. Under **Authorized redirect URIs**, add **exactly**:
   `https://<your-prod-domain>/api/auth/callback/google`
3. Copy the **Client ID** and **Client Secret** into the `wrangler secret put` calls above.

> **Redirect URI must match byte-for-byte** (scheme + host + path). Localhost is
> not registered because dev doesn't use Google. If you change your prod domain
> later, add the new redirect URI in the console before deploying.

OAuth consent screen note: while the app is in "Testing" status, only the
test users you add can sign in. For any Google account to register, click
**Publish App** in the OAuth consent screen (verification is not required for
`openid email profile` scopes on personal projects).

### 3. Apply migrations to the remote database

```bash
npm run db:migrate:remote
```

### 4. Build & deploy

```bash
npm run deploy   # nuxt build && wrangler deploy
```

### 5. One-time D1 cleanup (only if migrating from email/password)

If you previously deployed with email/password enabled and want to drop those
old accounts:

```bash
wrangler d1 execute box-organiser-db --remote --command \
  "DELETE FROM session; DELETE FROM account; DELETE FROM user;"
```

If this is your first Google-only deploy, skip this step.

## Project structure

```
server/
  database/schema.ts          Drizzle schema (Better Auth tables + boxes + items)
  utils/db.ts                 Drizzle instance from D1 binding
  utils/auth.ts               Better Auth instance (email in dev, Google in prod) + requireUser()
  api/
    auth/[...all].ts          Better Auth catch-all (sign-in/up/out + social)
    auth/session.get.ts       current session (for the client)
    auth/mode.get.ts          active providers (email | google)
    boxes.get.ts / .post.ts   list (filters/counts) / create (auto shareCode)
    boxes/[id].{get,patch,delete}.ts
    boxes/[id]/regenerate-qr.post.ts
    boxes/[id]/items.{get,post}.ts
    items/[id].{patch,delete}.ts
    public/boxes/[shareCode].get.ts   no-auth read-only box view
composables/
  useAuth.ts                  session state + login/register/signInWithGoogle/logout
  useQr.ts                    QR dataURL + share URL helpers
  usePdf.ts                   jsPDF: QR, manifest, label sheet
middleware/auth.global.ts     protects all non-public routes
pages/
  index.vue                   dashboard (boxes + filters + counts)
  login.vue                   email/password (dev) OR Google button (prod)
  register.vue                dev-only; redirects to /login in prod
  boxes/new.vue               create box
  boxes/[id].vue              box detail: edit, items, QR, PDF exports
  b/[shareCode].vue           public read-only view (what QR opens)
  scan.vue                    camera QR scanner
  labels.vue                  bulk label-sheet PDF
  warehouses/index.vue        list of warehouses
  warehouses/new.vue          create warehouse
  warehouses/[id]/index.vue   detail with Boxes / Members / Settings tabs
  invite/[token].vue          public invite view + accept
wrangler.jsonc                D1 binding + vars + assets config
.dev.vars                     local-only env (gitignored)
drizzle.config.ts             drizzle-kit config
docs/PLAN-google-sso.md       design notes for the dev/prod auth split
```

## Warehouses

Boxes can be grouped into a **warehouse** so a team can manage the same
inventory. Each warehouse has a roster with one of three roles:

| Role | Can do |
|------|--------|
| **owner** | Rename / delete the warehouse, invite / remove members, change roles, and do anything an editor can. |
| **editor** | Create / edit / delete boxes and items, rotate QRs, move boxes in or out of the warehouse. |
| **viewer** | Read-only access to the warehouse's boxes (including the QR public view). |

### Quick tour

1. **Create** — `/warehouses` → **+ New warehouse**. The creator is the first owner.
2. **Invite** — open the warehouse → **Members** tab → enter an email and a role. The link is shown in the UI and logged to the console in dev (email delivery is a v1.1 item). Anyone with the link can view the invite; only the matching email can accept it.
3. **Accept** — the invitee opens `/invite/{token}`. If they're not signed in, they see **Log in** / **Register**; on return, the **Accept** button becomes active.
4. **Move boxes** — open a box, click **Move…** to put it in (or take it out of) any warehouse where you have `editor+`.

### Authorization at a glance

- **View a box** — you're the box's `ownerId` OR a member of its warehouse.
- **Edit a box** — same as view, plus your warehouse role is `editor` or `owner`. Personal boxes (`warehouseId = NULL`) are editable only by their owner.
- **Public QR (`/b/{shareCode}`)** — still works for non-members, by design. The public view now shows the warehouse name if the box is in one.

### Edge cases

- The **last owner** of a warehouse cannot be removed or demoted, and cannot leave the warehouse.
- **Soft-deleting** a warehouse sets `archivedAt`, removes all members, and reverts boxes to personal. Public QR codes keep working.
- An **invitation token** expires after 7 days, can be revoked by the owner, and is single-use. Tokens are tied to a specific email — signing in with a different email returns 403.

The full design and API surface is in [`docs/PLAN-warehouses.md`](docs/PLAN-warehouses.md).

## Notes & caveats

- **SPA mode** (`ssr: false`) is used to avoid SSR session/cookie complexity. API
  routes still run server-side on the Worker. The public box view renders client-side.
- **Better Auth instance is created per request** from `event.context.cloudflare.env`,
  because Workers expose config via bindings, not `process.env`.
- The auth schema in `server/database/schema.ts` matches Better Auth's defaults. If
  you customise auth options, regenerate with `npx @better-auth/cli generate` and
  reconcile the tables.
- `.dev.vars` is gitignored. `.env.example` documents every key with the
  required environment (dev / prod) and the `wrangler secret put` command.
- Item photos, account linking, audit history, CSV backup, and offline PWA are
  intentionally out of scope for this build.
