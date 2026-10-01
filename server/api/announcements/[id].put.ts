import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { announcementSchema } from '../../validators/forms'

// Only drafts can be edited — a sent message can't be changed on parents' phones.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'announcements')
  const id = getRouterParam(event, 'id')!
  const input = await parseBody(event, announcementSchema)

  const existing = await prisma.announcement.findUnique({ where: { id }, select: { status: true } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Announcement not found.' })
  if (existing.status !== 'DRAFT') throw createError({ statusCode: 409, statusMessage: 'Only drafts can be edited.' })

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      title: input.title,
      message: input.message,
      targetType: input.targetType,
      targetClass: input.targetType === 'CLASS' ? input.targetClass : null,
      targetStudentId: input.targetType === 'STUDENT' ? input.targetStudentId : null
    }
  })

  await logAudit({ userId: user.id, action: 'announcement.updated', entity: 'Announcement', entityId: id })
  return announcement
})
