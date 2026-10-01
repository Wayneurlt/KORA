import { requireManage } from '../../../utils/rbac'
import { prisma } from '../../../utils/prisma'
import { parseBody } from '../../../utils/validate'
import { logAudit } from '../../../utils/audit'
import { parentLinkSchema } from '../../../validators/forms'

// Link an existing parent to a student.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'students')
  const studentId = getRouterParam(event, 'id')!
  const input = await parseBody(event, parentLinkSchema)

  const [student, parent] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, select: { id: true } }),
    prisma.parent.findUnique({ where: { id: input.parentId }, select: { id: true } })
  ])
  if (!student || !parent) throw createError({ statusCode: 404, statusMessage: 'Student or parent not found.' })

  const link = await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId } },
    update: { relationship: input.relationship },
    create: { parentId: parent.id, studentId, relationship: input.relationship }
  })

  await logAudit({ userId: user.id, action: 'parent.linked', entity: 'ParentStudent', entityId: link.id, metadata: { parentId: parent.id, studentId } })
  return link
})
