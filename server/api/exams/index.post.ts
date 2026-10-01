import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { examSchema } from '../../validators/forms'

export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'results')
  const input = await parseBody(event, examSchema)

  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw createError({ statusCode: 400, statusMessage: 'The end date is before the start date.' })
  }

  const exam = await prisma.exam.create({ data: { ...input, status: 'DRAFT' } })
  await logAudit({ userId: user.id, action: 'exam.created', entity: 'Exam', entityId: exam.id, metadata: { name: exam.name } })
  return exam
})
