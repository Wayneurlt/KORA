import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { feeChargeSchema } from '../../validators/forms'

// Bill one student, or every active student in a class.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'fees')
  const input = await parseBody(event, feeChargeSchema)

  const students = await prisma.student.findMany({
    where: input.target === 'STUDENT'
      ? { id: input.studentId }
      : { className: input.className, status: 'ACTIVE' },
    select: { id: true }
  })
  if (!students.length) {
    throw createError({ statusCode: 404, statusMessage: input.target === 'STUDENT' ? 'Student not found.' : 'No active students in that class.' })
  }

  const { count } = await prisma.feeRecord.createMany({
    data: students.map(student => ({
      studentId: student.id,
      description: input.description,
      term: input.term,
      academicYear: input.academicYear,
      amount: input.amount,
      dueDate: input.dueDate
    }))
  })

  await logAudit({
    userId: user.id,
    action: 'fees.billed',
    entity: 'FeeRecord',
    metadata: { target: input.target, className: input.className ?? null, studentId: input.studentId ?? null, description: input.description, amount: input.amount, count }
  })

  return { count, total: count * input.amount }
})
