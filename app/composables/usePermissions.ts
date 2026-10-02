import { canAccessSection, canManageSection, type AppSection } from '~~/shared/access'

/** UI-side permission checks — the server enforces the same rules. */
export function usePermissions() {
  const { user } = useUserSession()

  return {
    can: (section: AppSection) => !!user.value && canAccessSection(user.value.role, section),
    canManage: (section: AppSection) => !!user.value && canManageSection(user.value.role, section)
  }
}
