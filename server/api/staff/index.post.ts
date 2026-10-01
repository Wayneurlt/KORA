import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody, rethrowUnique } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { hashPasswordScrypt } from '../../utils/password'
import { generateTempPassword } from '../../utils/tempPassword'
import { staffCreateSchema } from '../../validators/forms'

// Creates a staff account with a one-time password (shown once, changed on first login).
export default defineEventHandler(async (event) => {
  const admin = await requireManage(event, 'staff')
  const input = await parseBody(event, staffCreateSchema)

  const tempPassword = generateTempPassword()
  const user = await prisma.user.create({
    data: { ...input, passwordHash: await hashPasswordScrypt(tempPassword), mustChangePassword: true },
    select: { id: true, name: true, email: true, role: true }
  }).catch(error => rethrowUnique(error, `${input.email} already has an account.`))

  await logAudit({ userId: admin.id, action: 'staff.created', entity: 'User', entityId: user.id, metadata: { role: user.role } })
  return { user, tempPassword }
})
