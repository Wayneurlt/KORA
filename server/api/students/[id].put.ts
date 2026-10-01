import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody, rethrowUnique } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { studentSchema } from '../../validators/forms'

export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'students')
  const id = getRouterParam(event, 'id')!
  const input = await parseBody(event, studentSchema)

  const existing = await prisma.student.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Student not found.' })

  const student = await prisma.student.update({ where: { id }, data: input })
    .catch(error => rethrowUnique(error, `Admission number ${input.admissionNumber} is already in use.`))

  await logAudit({ userId: user.id, action: 'student.updated', entity: 'Student', entityId: id })
  return student
})
