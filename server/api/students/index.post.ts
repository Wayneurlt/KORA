import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody, rethrowUnique } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { studentSchema } from '../../validators/forms'

export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'students')
  const input = await parseBody(event, studentSchema)

  const student = await prisma.student.create({ data: input })
    .catch(error => rethrowUnique(error, `Admission number ${input.admissionNumber} is already in use.`))

  await logAudit({ userId: user.id, action: 'student.created', entity: 'Student', entityId: student.id, metadata: { admissionNumber: student.admissionNumber } })
  return student
})
