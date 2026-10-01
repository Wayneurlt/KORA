import type { AppSection } from '../access'

declare module 'vue-router' {
  interface RouteMeta {
    section?: AppSection
    title?: string
    description?: string
    /** Page renders its own <PageHeader> (e.g. to add action buttons) */
    hideHeader?: boolean
  }
}

export {}
