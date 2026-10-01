import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody, rethrowUnique } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { parentSchema } from '../../validators/forms'
import { normalizePhone } from '../../../shared/phone'

// Updates contact details. Children are managed from the student panel, so
// `children` in the body is ignored here.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'students')
  const id = getRouterParam(event, 'id')!
  const input = await parseBody(event, parentSchema)

  const existing = await prisma.parent.findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Parent not found.' })

  const numberChanged = existing.whatsappNumber !== input.whatsappNumber
  const parent = await prisma.parent.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      whatsappNumber: input.whatsappNumber,
      phoneNumber: (input.phoneNumber && normalizePhone(input.phoneNumber)) || input.whatsappNumber,
      email: input.email,
      // A new number has to be verified again on WhatsApp.
      ...(numberChanged && { verificationStatus: 'UNVERIFIED', verificationCode: null })
    }
  }).catch(error => rethrowUnique(error, `A parent with WhatsApp number +${input.whatsappNumber} already exists.`))

  await logAudit({ userId: user.id, action: 'parent.updated', entity: 'Parent', entityId: id, metadata: { numberChanged } })
  return parent
})
