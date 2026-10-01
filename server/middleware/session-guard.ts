import { getFreshUser } from '../utils/sessionCache'

// Keeps signed-in sessions in step with the database:
//  - deactivated or deleted staff are signed out on their next request
//  - role / name changes are written into the session
//  - staff with a one-time password can only change their password

const SKIP = ['/api/auth/login', '/api/public/', '/api/whatsapp/webhook']
const ALLOWED_WHILE_CHANGING_PASSWORD = ['/api/account/password', '/api/auth/logout', '/api/_auth/session']

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0]!
  if (!path.startsWith('/api/') || SKIP.some(prefix => path.startsWith(prefix))) return

  const session = await getUserSession(event)
  if (!session.user) return

  const fresh = await getFreshUser(session.user.id)
  if (!fresh || fresh.status !== 'ACTIVE') {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Your account is no longer active.' })
  }

  const { user } = session
  if (user.role !== fresh.role || user.name !== fresh.name || !!user.mustChangePassword !== fresh.mustChangePassword) {
    await replaceUserSession(event, {
      ...session,
      user: { ...user, role: fresh.role, name: fresh.name, mustChangePassword: fresh.mustChangePassword }
    })
  }

  if (fresh.mustChangePassword && !ALLOWED_WHILE_CHANGING_PASSWORD.some(prefix => path.startsWith(prefix))) {
    throw createError({ statusCode: 403, statusMessage: 'Please choose a new password first.' })
  }
})
