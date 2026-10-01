import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody, rethrowUnique } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { parentSchema } from '../../validators/forms'
import { normalizePhone } from '../../../shared/phone'

export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'students')
  const input = await parseBody(event, parentSchema)

  const parent = await prisma.parent.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      whatsappNumber: input.whatsappNumber,
      phoneNumber: (input.phoneNumber && normalizePhone(input.phoneNumber)) || input.whatsappNumber,
      email: input.email,
      children: {
        create: input.children.map(child => ({ studentId: child.studentId, relationship: child.relationship }))
      }
    }
  }).catch(error => rethrowUnique(error, `A parent with WhatsApp number +${input.whatsappNumber} already exists.`))

  await logAudit({ userId: user.id, action: 'parent.created', entity: 'Parent', entityId: parent.id, metadata: { children: input.children.length } })
  return parent
})
