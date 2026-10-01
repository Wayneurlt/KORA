import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { examStatusSchema } from '../../validators/forms'

// Publish (parents can see results), move back to draft, or archive an exam.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'results')
  const id = getRouterParam(event, 'id')!
  const { status } = await parseBody(event, examStatusSchema)

  const exam = await prisma.exam.findUnique({ where: { id }, include: { _count: { select: { results: true } } } })
  if (!exam) throw createError({ statusCode: 404, statusMessage: 'Exam not found.' })
  if (status === 'PUBLISHED' && exam._count.results === 0) {
    throw createError({ statusCode: 409, statusMessage: 'Enter some scores before publishing.' })
  }

  const updated = await prisma.exam.update({ where: { id }, data: { status } })
  await logAudit({ userId: user.id, action: `exam.${status.toLowerCase()}`, entity: 'Exam', entityId: id, metadata: { from: exam.status, to: status } })
  return updated
})
