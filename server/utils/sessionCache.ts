import { prisma } from './prisma'

// Sessions are sealed cookies, so a deactivated user or a role change would
// otherwise only take effect when the 8-hour session expires. The session guard
// middleware re-reads the user (cached briefly) on every API request.

interface FreshUser {
  status: 'ACTIVE' | 'INACTIVE'
  role: 'ADMIN' | 'FINANCE' | 'ACADEMIC' | 'SUPPORT'
  name: string
  mustChangePassword: boolean
}

const TTL_MS = 30_000
const cache = new Map<string, { user: FreshUser | null, at: number }>()

export async function getFreshUser(id: string): Promise<FreshUser | null> {
  const hit = cache.get(id)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.user

  const user = await prisma.user.findUnique({
    where: { id },
    select: { status: true, role: true, name: true, mustChangePassword: true }
  })
  cache.set(id, { user, at: Date.now() })
  return user
}

/** Drop the cached copy so the next request sees changes immediately. */
export function forgetSessionUser(id: string) {
  cache.delete(id)
}
