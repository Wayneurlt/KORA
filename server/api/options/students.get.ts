import { z } from 'zod'
import { canAccessSection } from '../../../shared/access'
import { prisma } from '../../utils/prisma'
import { contains, searchWhere } from '../../validators/lists'

// Lightweight student search for pickers (record payment, link parent, announcement target).
const query = z.object({ search: z.string().trim().max(100).optional() })

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!(['students', 'fees', 'results', 'announcements'] as const).some(section => canAccessSection(user.role, section))) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have permission to search students.' })
  }
  const { search } = await getValidatedQuery(event, query.parse)

  const students = await prisma.student.findMany({
    where: {
      status: 'ACTIVE',
      ...searchWhere(search, term => [{ firstName: contains(term) }, { lastName: contains(term) }, { admissionNumber: contains(term) }])
    },
    orderBy: [{ className: 'asc' }, { lastName: 'asc' }],
    take: 20,
    select: { id: true, firstName: true, lastName: true, admissionNumber: true, className: true, stream: true }
  })

  return students.map(student => ({
    id: student.id,
    label: `${student.firstName} ${student.lastName}`,
    description: `${student.admissionNumber} · ${student.className}${student.stream ? ` · ${student.stream}` : ''}`
  }))
})
