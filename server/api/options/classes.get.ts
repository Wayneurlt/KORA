import { prisma } from '../../utils/prisma'

// Distinct class names in use, for class pickers.
export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const rows = await prisma.student.groupBy({ by: ['className'], where: { status: 'ACTIVE' }, _count: { _all: true } })
  return rows
    .map(row => ({ className: row.className, count: row._count._all }))
    .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }))
})
