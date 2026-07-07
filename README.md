# Box Organiser

A multi-user inventory box manager built with **Nuxt + Cloudflare D1**. Each box
gets a QR code that links to a public, read-only view of its contents. The QR code
is **rotatable** (regenerating it invalidates old prints).

## Features

- **Multi-user auth** — email/password login via [Better Auth](https://better-auth.com) (Drizzle/D1 adapter).
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

## Prerequisites

- Node.js 20+
- A Cloudflare account (free tier works). Install and login:
  ```bash
  npx wrangler login
  ```

## Setup

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

### 4. Run the dev server

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

### 1. Configure secrets & URL

```bash
# Set the production site URL as a var (or edit wrangler.jsonc `vars`)
npx wrangler secret put NUXT_PUBLIC_SITE_URL
# Set the Better Auth session secret (generate with: openssl rand -base64 32)
npx wrangler secret put BETTER_AUTH_SECRET
```

> For local dev, both are provided via `wrangler.jsonc` `vars`. Never commit a real
> production secret. (`.env.example` documents them; `.env` is gitignored.)

### 2. Apply migrations to the remote database

```bash
npm run db:migrate:remote
```

### 3. Build & deploy

```bash
npm run deploy   # nuxt build && wrangler deploy
```

## Project structure

```
server/
  database/schema.ts          Drizzle schema (Better Auth tables + boxes + items)
  utils/db.ts                 Drizzle instance from D1 binding
  utils/auth.ts               Better Auth instance + requireUser()
  api/
    auth/[...all].ts          Better Auth catch-all (sign-in/up/out)
    auth/session.get.ts       current session (for the client)
    boxes.get.ts / .post.ts   list (filters/counts) / create (auto shareCode)
    boxes/[id].{get,patch,delete}.ts
    boxes/[id]/regenerate-qr.post.ts
    boxes/[id]/items.{get,post}.ts
    items/[id].{patch,delete}.ts
    public/boxes/[shareCode].get.ts   no-auth read-only box view
composables/
  useAuth.ts                  session state + login/register/logout
  useQr.ts                    QR dataURL + share URL helpers
  usePdf.ts                   jsPDF: QR, manifest, label sheet
middleware/auth.global.ts     protects all non-public routes
pages/
  index.vue                   dashboard (boxes + filters + counts)
  login.vue / register.vue
  boxes/new.vue               create box
  boxes/[id].vue              box detail: edit, items, QR, PDF exports
  b/[shareCode].vue           public read-only view (what QR opens)
  scan.vue                    camera QR scanner
  labels.vue                  bulk label-sheet PDF
wrangler.jsonc                D1 binding + vars + assets config
drizzle.config.ts             drizzle-kit config
```

## Notes & caveats

- **SPA mode** (`ssr: false`) is used to avoid SSR session/cookie complexity. API
  routes still run server-side on the Worker. The public box view renders client-side.
- **Better Auth instance is created per request** from `event.context.cloudflare.env`,
  because Workers expose config via bindings, not `process.env`.
- The auth schema in `server/database/schema.ts` matches Better Auth's defaults. If
  you customise auth options, regenerate with `npx @better-auth/cli generate` and
  reconcile the tables.
- Item photos, OAuth/social login, audit history, CSV backup, and offline PWA are
  intentionally out of scope for this build.
