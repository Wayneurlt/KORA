import type { H3Event } from 'h3'
import { canAccessSection, type AppSection } from '../../shared/access'

/**
 * Authenticates the request and asserts the logged-in staff user may access
 * the given dashboard section. Never rely on the frontend nav for this —
 * every protected API route must call this (or requireRole) itself.
 */
export async function requireSection(event: H3Event, section: AppSection) {
  const { user } = await requireUserSession(event)

  if (!canAccessSection(user.role, section)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to access this section.'
    })
  }

  return user
}

export async function requireRole(event: H3Event, roles: readonly string[]) {
  const { user } = await requireUserSession(event)

  if (!roles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to perform this action.'
    })
  }

  return user
}
