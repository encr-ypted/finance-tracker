// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxtjs/supabase',
    '@nuxt/ui',
    '@nuxt/icon'
  ],

  app: {
    head: {
      title: 'LifeOS',
      meta: [
        { name: 'description', content: 'Your personal Life Operating System' },
        { name: 'theme-color', content: '#0a0a0f' },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        },
      ],
    },
  },

  supabase: {
    redirect: false,
  }
})