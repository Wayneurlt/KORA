import { requireManage } from '../../../utils/rbac'
import { prisma } from '../../../utils/prisma'
import { logAudit } from '../../../utils/audit'
import { hashPasswordScrypt } from '../../../utils/password'
import { generateTempPassword } from '../../../utils/tempPassword'
import { forgetSessionUser } from '../../../utils/sessionCache'

// Admin-initiated reset: issues a one-time password the staff member must change on login.
export default defineEventHandler(async (event) => {
  const admin = await requireManage(event, 'staff')
  const id = getRouterParam(event, 'id')!

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Staff member not found.' })
  if (id === admin.id) throw createError({ statusCode: 409, statusMessage: 'Change your own password from My account.' })

  const tempPassword = generateTempPassword()
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPasswordScrypt(tempPassword), mustChangePassword: true }
  })

  forgetSessionUser(id)
  await logAudit({ userId: admin.id, action: 'staff.password_reset', entity: 'User', entityId: id })
  return { tempPassword }
})
