import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { paymentUpdateSchema } from '../../validators/forms'

// Allowed status changes: confirm or reject a pending payment, refund a completed one.
const TRANSITIONS: Record<string, string[]> = {
  PENDING: ['COMPLETED', 'FAILED'],
  COMPLETED: ['REFUNDED']
}

export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'fees')
  const id = getRouterParam(event, 'id')!
  const { status } = await parseBody(event, paymentUpdateSchema)

  const payment = await prisma.payment.findUnique({ where: { id } })
  if (!payment) throw createError({ statusCode: 404, statusMessage: 'Payment not found.' })
  if (!TRANSITIONS[payment.status]?.includes(status)) {
    throw createError({ statusCode: 409, statusMessage: `A ${payment.status.toLowerCase()} payment can't be marked ${status.toLowerCase()}.` })
  }

  const updated = await prisma.payment.update({ where: { id }, data: { status } })
  await logAudit({
    userId: user.id,
    action: `payment.${status.toLowerCase()}`,
    entity: 'Payment',
    entityId: id,
    metadata: { from: payment.status, to: status, amount: payment.amount }
  })
  return updated
})
