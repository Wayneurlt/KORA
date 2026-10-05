import { canAccessSection, type AppSection } from '~~/shared/access'

interface NavItem {
  label: string
  to: string
  icon: string
  section: AppSection
  /** Key into /api/dashboard/badges for a count pill */
  badge?: 'openConversations'
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: 'i-lucide-layout-dashboard', section: 'dashboard' },
  { label: 'Students', to: '/dashboard/students', icon: 'i-lucide-users', section: 'students' },
  { label: 'Parents', to: '/dashboard/parents', icon: 'i-lucide-contact', section: 'students' },
  { label: 'Results', to: '/dashboard/results', icon: 'i-lucide-graduation-cap', section: 'results' },
  { label: 'Fees', to: '/dashboard/fees', icon: 'i-lucide-wallet', section: 'fees' },
  { label: 'Announcements', to: '/dashboard/announcements', icon: 'i-lucide-megaphone', section: 'announcements' },
  { label: 'Conversations', to: '/dashboard/conversations', icon: 'i-lucide-message-circle', section: 'conversations', badge: 'openConversations' },
  { label: 'Staff', to: '/dashboard/staff', icon: 'i-lucide-user-cog', section: 'staff' },
  { label: 'Settings', to: '/dashboard/settings', icon: 'i-lucide-settings', section: 'settings' }
]

export function useDashboardNav() {
  const { user } = useUserSession()

  const items = computed(() =>
    NAV_ITEMS.filter(item => user.value && canAccessSection(user.value.role, item.section))
  )

  return { items }
}
