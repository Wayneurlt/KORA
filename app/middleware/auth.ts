import { canAccessSection, type AppSection } from '~~/shared/access'

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo('/login')
  }

  // Staff signing in with a one-time password must pick their own first.
  if (user.value?.mustChangePassword && to.path !== '/dashboard/account') {
    return navigateTo('/dashboard/account')
  }

  const section = to.meta.section as AppSection | undefined

  if (section && user.value && !canAccessSection(user.value.role, section)) {
    return navigateTo('/dashboard')
  }
})
