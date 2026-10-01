import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { hashPasswordScrypt, verifyPasswordScrypt } from '../../utils/password'
import { passwordChangeSchema } from '../../validators/forms'
import { forgetSessionUser } from '../../utils/sessionCache'

// Any signed-in staff member changing their own password.
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const input = await parseBody(event, passwordChangeSchema)

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Account not found.' })

  if (!(await verifyPasswordScrypt(user.passwordHash, input.currentPassword))) {
    throw createError({ statusCode: 400, statusMessage: 'Your current password is incorrect.' })
  }
  if (input.currentPassword === input.newPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a password different from the current one.' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPasswordScrypt(input.newPassword), mustChangePassword: false }
  })

  forgetSessionUser(user.id)
  await replaceUserSession(event, { ...session, user: { ...session.user, mustChangePassword: false } })
  await logAudit({ userId: user.id, action: 'account.password_changed', entity: 'User', entityId: user.id })
  return { ok: true }
})
