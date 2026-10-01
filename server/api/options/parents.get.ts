import { z } from 'zod'
import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { contains, searchWhere } from '../../validators/lists'

// Lightweight parent search for the "link parent" picker.
const query = z.object({ search: z.string().trim().max(100).optional() })

export default defineEventHandler(async (event) => {
  await requireSection(event, 'students')
  const { search } = await getValidatedQuery(event, query.parse)

  const parents = await prisma.parent.findMany({
    where: {
      status: 'ACTIVE',
      ...searchWhere(search, term => [{ firstName: contains(term) }, { lastName: contains(term) }, { whatsappNumber: contains(term) }])
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: 20,
    select: { id: true, firstName: true, lastName: true, whatsappNumber: true }
  })

  return parents.map(parent => ({
    id: parent.id,
    label: `${parent.firstName} ${parent.lastName}`,
    description: `+${parent.whatsappNumber}`
  }))
})
