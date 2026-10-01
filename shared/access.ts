// Isomorphic role/section access map. Values must stay in sync with the
// `Role` enum in prisma/schema.prisma.
export const ROLES = ['ADMIN', 'FINANCE', 'ACADEMIC', 'SUPPORT'] as const
export type AppRole = (typeof ROLES)[number]

export const SECTIONS = [
  'dashboard',
  'students',
  'results',
  'fees',
  'announcements',
  'conversations',
  'settings'
] as const
export type AppSection = (typeof SECTIONS)[number]

/**
 * Which dashboard sections each role may open. This drives both the sidebar
 * (UX only) and the server-side route guard (`requireSection` in
 * server/utils/rbac.ts) — the server check is the one that actually matters.
 */
export const SECTION_ACCESS: Record<AppSection, readonly AppRole[]> = {
  dashboard: ['ADMIN', 'FINANCE', 'ACADEMIC', 'SUPPORT'],
  students: ['ADMIN', 'FINANCE', 'ACADEMIC'],
  results: ['ADMIN', 'ACADEMIC'],
  fees: ['ADMIN', 'FINANCE'],
  announcements: ['ADMIN'],
  conversations: ['ADMIN', 'SUPPORT'],
  settings: ['ADMIN']
}

export function canAccessSection(role: AppRole, section: AppSection): boolean {
  return SECTION_ACCESS[section].includes(role)
}
