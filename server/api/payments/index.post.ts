import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { paymentCreateSchema } from '../../validators/forms'
import { getFeeBalances } from '../../services/fees.service'

export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'fees')
  const input = await parseBody(event, paymentCreateSchema)

  const student = await prisma.student.findUnique({ where: { id: input.studentId }, select: { id: true, firstName: true, lastName: true } })
  if (!student) throw createError({ statusCode: 404, statusMessage: 'Student not found.' })

  if (input.paymentReference) {
    const duplicate = await prisma.payment.findFirst({
      where: { paymentReference: input.paymentReference, status: { in: ['COMPLETED', 'PENDING'] } },
      select: { id: true }
    })
    if (duplicate) throw createError({ statusCode: 409, statusMessage: `Reference ${input.paymentReference} has already been recorded.` })
  }

  const payment = await prisma.payment.create({
    data: {
      studentId: student.id,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
      paymentDate: input.paymentDate ?? new Date(),
      status: input.status
    }
  })

  await logAudit({
    userId: user.id,
    action: 'payment.recorded',
    entity: 'Payment',
    entityId: payment.id,
    metadata: { studentId: student.id, amount: input.amount, method: input.paymentMethod, status: input.status }
  })

  const balance = (await getFeeBalances([student.id])).get(student.id)
  return { payment, balance }
})
