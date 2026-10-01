import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { staffUpdateSchema } from '../../validators/forms'
import { forgetSessionUser } from '../../utils/sessionCache'

export default defineEventHandler(async (event) => {
  const admin = await requireManage(event, 'staff')
  const id = getRouterParam(event, 'id')!
  const input = await parseBody(event, staffUpdateSchema)

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Staff member not found.' })

  const losingAdmin = user.role === 'ADMIN' && user.status === 'ACTIVE'
    && ((input.role && input.role !== 'ADMIN') || input.status === 'INACTIVE')

  if (losingAdmin && id === admin.id) {
    throw createError({ statusCode: 409, statusMessage: 'You can\'t remove your own admin access. Ask another admin to do it.' })
  }
  if (losingAdmin) {
    const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE', id: { not: id } } })
    if (!otherAdmins) throw createError({ statusCode: 409, statusMessage: 'The school needs at least one active admin.' })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: input,
    select: { id: true, name: true, email: true, role: true, status: true, mustChangePassword: true }
  })

  // Deactivated users are signed out and role changes apply on their next request.
  forgetSessionUser(id)
  await logAudit({ userId: admin.id, action: 'staff.updated', entity: 'User', entityId: id, metadata: { ...input } })
  return updated
})
