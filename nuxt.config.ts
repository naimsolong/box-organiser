// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  // Keep Nuxt 3 directory conventions (app code at project root) on Nuxt 4.
  future: { compatibilityVersion: 3 },
  devtools: { enabled: true },

  // SPA mode: the app is an auth-gated dashboard, so CSR avoids SSR session/cookie
  // complexity. API routes still run server-side on the Cloudflare Worker.
  ssr: false,

  modules: ['nitro-cloudflare-dev'],

  // Deploy to Cloudflare Workers. D1 + vars bindings live in wrangler.jsonc and are
  // auto-detected by Nitro's built-in Cloudflare dev emulation during `nuxt dev`.
  nitro: {
    preset: 'cloudflare_module',
  },

  runtimeConfig: {
    public: {
      // Set NUXT_PUBLIC_SITE_URL in production for absolute QR links.
      // Empty = build QR links from the request origin.
      siteUrl: '',
    },
  },
})
