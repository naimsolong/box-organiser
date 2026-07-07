// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  // Deploy to Cloudflare Workers. Bindings (D1, KV, R2, ...) are declared in
  // wrangler.jsonc and auto-detected by Nitro's built-in Cloudflare dev emulation.
  nitro: {
    preset: 'cloudflare_module',
  },
})
