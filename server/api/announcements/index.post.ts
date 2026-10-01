import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { announcementSchema } from '../../validators/forms'

// Creates a draft. Publishing (and sending) is a separate step.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'announcements')
  const input = await parseBody(event, announcementSchema)

  if (input.targetType === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { id: input.targetStudentId! }, select: { id: true } })
    if (!student) throw createError({ statusCode: 404, statusMessage: 'Student not found.' })
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      message: input.message,
      targetType: input.targetType,
      targetClass: input.targetType === 'CLASS' ? input.targetClass : null,
      targetStudentId: input.targetType === 'STUDENT' ? input.targetStudentId : null,
      status: 'DRAFT',
      createdById: user.id
    }
  })

  await logAudit({ userId: user.id, action: 'announcement.created', entity: 'Announcement', entityId: announcement.id })
  return announcement
})
