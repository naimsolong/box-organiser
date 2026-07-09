# Google SSO Migration — Implementation Plan

Switch the auth method **based on environment**: keep **email/password in local
dev** (fast iteration, no OAuth setup) and use **Google SSO in production**
(proper identity, no password handling). Better Auth's `emailAndPassword` and
`socialProviders.google` are independent options, so this is a single config
function with a branch on `NODE_ENV` (or any env-detection signal that
distinguishes Workers prod from `nuxt dev`).

## Decisions locked (from clarification)

| Area | Decision |
|------|----------|
| Local dev auth | **Email/password** (current behavior). No Google setup required. |
| Production auth | **Google SSO only**. No email/password sign-in on the deployed app. |
| New-user policy | Any Google account can register on first sign-in. |
| Account linking | Skip in v1. |
| UI | `/login` shows both modes conditionally (or two routes — see UI section). |

## Why this is still small

- The D1 schema doesn't change — Better Auth's `account` table already models
  both password credentials (`providerId='credential'`, `password` field) and
  OAuth links (`providerId='google'`, `accountId=<google-sub>`).
- Better Auth lets you enable both providers simultaneously. We just toggle
  which one is offered based on env.
- The auth flow stays per-request (`getAuth(event)` from
  `event.context.cloudflare.env`). Only the `betterAuth({...})` config branches
  on environment.
- One set of API routes. The catch-all already routes both
  `/api/auth/sign-in/email` and `/api/auth/sign-in/social`.

## How to detect "local dev" on Workers

Two signals, in order of preference:

1. **`baseURL` is `http://localhost:3000`** — robust, doesn't depend on
   `NODE_ENV` (which is `'production'` in Nuxt server bundles regardless of dev
   vs prod). Pick this.
2. Fallback: `process.env.NODE_ENV === 'development'` — note that on Workers
   `NODE_ENV` is always `'production'` for the deployed Worker, so this works
   in dev (`nuxt dev`) but is brittle if you ever run a built bundle locally.

**Decision: branch on `baseURL.includes('localhost')`.** Treat the prod domain
as the boundary — when `NUXT_PUBLIC_SITE_URL` is set to the prod domain (which
it always is on the deployed Worker), we're in prod mode. If it's unset or
points at localhost, we're in dev.

## What changes

### `server/utils/auth.ts`
- Read the env-bound `baseURL` as before.
- Compute `isDev = baseURL.includes('localhost')`.
- Always set `secret`, `database`, `trustedOrigins`.
- If `isDev`: enable `emailAndPassword: { enabled: true }`, omit
  `socialProviders`.
- If `!isDev`: disable `emailAndPassword` (or omit it — same effect), enable
  `socialProviders.google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }`.
- `requireUser` is unchanged.
- No new env var is required to *disable* email/password — simply not enabling
  it is enough.

### `server/api/auth/[...all].ts`
No change. The catch-all already handles both providers.

### Frontend

- `pages/login.vue` — render different content based on whether Google is
  configured. Easiest pattern: expose a public `/api/auth/mode` endpoint that
  returns `{ providers: ['email'] }` or `{ providers: ['google'] }` (or
  `['email', 'google']` if we ever want both in prod). The page renders the
  corresponding buttons.
- `pages/register.vue` — only shown in dev (email/password). Add a v-if or
  just leave it visible — in prod, the `register` endpoint will 404 from
  Better Auth anyway, so we should also gate the UI on the mode endpoint.
- `composables/useAuth.ts`:
  - `login(email, password)` — kept.
  - `register(name, email, password)` — kept.
  - `signInWithGoogle()` — added. Calls
    `$fetch('/api/auth/sign-in/social', { method: 'POST', body: { provider: 'google', callbackURL: '/' })`.
  - `logout()` — unchanged.

### Local D1 data
- In dev, existing email/password accounts continue to work.
- For the **remote** D1 in production: if any email/password users exist from
  earlier (pre-Google) deploys, they lose their login path. The README will
  document a one-time `wrangler d1 execute` to wipe `session`/`account`/`user`
  if needed. If you're going Google-only for the first deploy, this is a
  no-op.

### `wrangler.jsonc`
- `vars` keeps `NUXT_PUBLIC_SITE_URL` (so dev has the right origin).
- Remove `BETTER_AUTH_SECRET` from `vars` (move to `.dev.vars` like the Google
  keys — secrets shouldn't live in `wrangler.jsonc` even in dev once we have
  the file).
- `assets` and `d1_databases` unchanged.

### `.dev.vars` (new, local-only, gitignored)
```env
NUXT_PUBLIC_SITE_URL=http://localhost:3000
BETTER_AUTH_SECRET=dev-secret-change-me
```
No `GOOGLE_CLIENT_ID/SECRET` in dev — email/password doesn't need them. This
also means the env-detection branch in `getAuth()` works: in dev
`baseURL=http://localhost:3000` → `isDev=true` → no Google, no error if those
vars are missing.

> Wrangler reads `.dev.vars` automatically and surfaces it on the request env
> in dev. `.gitignore` already covers it (`.env*`).

### `.env.example`
Update to document both dev and prod keys. Indicate which are dev-only vs
required-in-prod.

## Cloudflare secrets (production)
```bash
wrangler secret put BETTER_AUTH_SECRET            # openssl rand -base64 32
wrangler secret put NUXT_PUBLIC_SITE_URL          # https://<prod-domain>
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

## Google Cloud Console setup (one-time, manual)
Same as the original plan:
1. Create OAuth client: **Web application**.
2. **Authorized JavaScript origins**: `https://<prod-domain>` (no localhost
   needed — dev doesn't use Google).
3. **Authorized redirect URIs**: `https://<prod-domain>/api/auth/callback/google`
   (one URI only — dev doesn't need it).
4. Copy Client ID + Secret into the two `wrangler secret put` commands.

## New dependencies
None. Better Auth's Google provider is built in.

## New files / changes summary

**Modify**
- `server/utils/auth.ts` — branch on `baseURL.includes('localhost')` to toggle
  email/password vs Google
- `composables/useAuth.ts` — add `signInWithGoogle()`; keep `login`/`register`
- `pages/login.vue` — render based on `/api/auth/mode` response
- `pages/register.vue` — gate visibility on dev mode (or delete and re-route
  `/register` → `/login` in dev only)
- `wrangler.jsonc` — drop `BETTER_AUTH_SECRET` from `vars`
- `.env.example` — document all four keys with which-env guidance
- `README.md` — replace Setup section; document Google + secrets; add a
  "Modes" note explaining dev vs prod behavior

**Create**
- `server/api/auth/mode.get.ts` — returns the active provider list
  (`['email']` in dev, `['google']` in prod). Cheap endpoint, just reads env.
- `.dev.vars` (local, gitignored) — `NUXT_PUBLIC_SITE_URL` + `BETTER_AUTH_SECRET`

**Delete**
- Nothing. `register.vue` stays as a thin page gated to dev.

## Phased implementation

1. **Server config + mode endpoint** — `getAuth()` branches; `/api/auth/mode`
   added. Local smoke test: `/api/auth/mode` returns `['email']`. With
   `NUXT_PUBLIC_SITE_URL` set to a non-localhost value, returns `['google']`.
2. **Local dev regression** — email/password login + register continue to
   work end-to-end. Confirm a fresh user can register, log in, log out, log
   in again.
3. **Google wiring (server + client)** — `signInWithGoogle()` in the
   composable; login page renders the Google button when `mode` includes
   `'google'`. `register.vue` hidden in prod. No real Google test yet — that
   needs the OAuth client.
4. **Production deploy** — Google Cloud Console + 4 secrets set, deploy, click
   the button on the prod URL, complete consent, land on `/`. Check D1:
   `user` row + `account` row with `providerId='google'`.
5. **Verify both modes** — dev still uses email/password; prod uses Google
   only. Document the env-detection rule in the README so it's not mysterious.

## Verification (overall)

- **Dev** (`npm run dev`): `/api/auth/mode` → `['email']`. Register a new user,
  log out, log back in. `/b/<code>` public view still works without login.
- **Prod** (`https://<prod-domain>`): `/api/auth/mode` → `['google']`. Login
  page shows only the Google button. Click → consent → `/`. Register page
  not visible (or shows a "Use Google to sign in" message).
- **Multi-user**: sign in with two different Google accounts in separate
  browser profiles; each sees only their own boxes.
- **Edge**: hit `/api/auth/sign-in/email` on the prod Worker → Better Auth
  returns 404/disabled (since `emailAndPassword` isn't enabled). Confirm the
  frontend doesn't show that path.

## Risks / things to watch

- **Env-detection rule** (`baseURL.includes('localhost')`) means if someone
  deploys with `NUXT_PUBLIC_SITE_URL` unset, the Worker treats that as
  dev-ish and email/password would be enabled in prod. We mitigate by
  treating any empty/unset `NUXT_PUBLIC_SITE_URL` as a misconfig and
  defaulting to a safe empty string that Better Auth will reject — or by
  requiring `NUXT_PUBLIC_SITE_URL` to be set in prod (the deploy runbook
  already does this). I'll log a warning in `getAuth()` if `baseURL` is
  empty on a non-dev path.
- **Google "Unverified app" warning** during consent. To suppress, submit
  the OAuth app for verification (not needed for `openid email profile`
  scopes on personal projects, but adds friction above Google's user cap).
- **Redirect URI must match exactly** between Google Console and code. The
  callback path is `${baseURL}/api/auth/callback/google`.
- **The dev `BETTER_AUTH_SECRET` placeholder** is fine for local dev but
  must be replaced with a real `openssl rand -base64 32` value when deployed.
  README will call this out.

## Out of scope / future

- Account linking (Google ↔ email/password).
- Other OAuth providers.
- Domain-restricted Google Workspace login.
- Google One Tap.
