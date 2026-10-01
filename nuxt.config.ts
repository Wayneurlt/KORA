// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    'nuxt-auth-utils'
  ],

  devtools: {
    enabled: true
  },

  app: {
    head: {
      meta: [
        { name: 'description', content: 'Kora — a WhatsApp-powered school communication platform connecting parents with student results, fees, announcements and support.' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    session: {
      maxAge: 60 * 60 * 8 // 8 hours
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
