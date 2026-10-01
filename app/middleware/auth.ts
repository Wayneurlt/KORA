import { canAccessSection, type AppSection } from '~~/shared/access'

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo('/login')
  }

  const section = to.meta.section as AppSection | undefined

  if (section && user.value && !canAccessSection(user.value.role, section)) {
    return navigateTo('/dashboard')
  }
})
