import { requireManage } from '../../../../utils/rbac'
import { prisma } from '../../../../utils/prisma'
import { logAudit } from '../../../../utils/audit'

// Unlink a parent from a student (the parent record itself is kept).
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'students')
  const studentId = getRouterParam(event, 'id')!
  const parentId = getRouterParam(event, 'parentId')!

  const { count } = await prisma.parentStudent.deleteMany({ where: { studentId, parentId } })
  if (!count) throw createError({ statusCode: 404, statusMessage: 'That parent is not linked to this student.' })

  await logAudit({ userId: user.id, action: 'parent.unlinked', entity: 'ParentStudent', metadata: { parentId, studentId } })
  return { ok: true }
})
