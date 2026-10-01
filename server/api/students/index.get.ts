import type { Prisma } from '@prisma/client'
import { canAccessSection } from '../../../shared/access'
import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { contains, searchWhere, studentListQuery } from '../../validators/lists'
import { emptyBalance, getFeeBalances } from '../../services/fees.service'

export default defineEventHandler(async (event) => {
  const user = await requireSection(event, 'students')
  const query = await getValidatedQuery(event, studentListQuery.parse)

  const where: Prisma.StudentWhereInput = {
    ...(query.status !== 'ALL' && { status: query.status }),
    ...(query.className && { className: query.className }),
    ...searchWhere(query.search, term => [
      { firstName: contains(term) },
      { lastName: contains(term) },
      { admissionNumber: contains(term) },
      { parents: { some: { parent: { OR: [{ firstName: contains(term) }, { lastName: contains(term) }, { whatsappNumber: contains(term) }] } } } }
    ])
  }

  const [total, students, classes] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: [{ className: 'asc' }, { stream: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        parents: {
          include: { parent: { select: { id: true, firstName: true, lastName: true, whatsappNumber: true } } }
        }
      }
    }),
    prisma.student.groupBy({
      by: ['className'],
      _count: { _all: true },
      where: query.status !== 'ALL' ? { status: query.status } : {},
      orderBy: { className: 'asc' }
    })
  ])

  const balances = canAccessSection(user.role, 'fees')
    ? await getFeeBalances(students.map(student => student.id))
    : null

  return {
    total,
    page: query.page,
    pageSize: query.pageSize,
    classes: classes.map(row => ({ className: row.className, count: row._count._all })),
    items: students.map(student => ({
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      className: student.className,
      stream: student.stream,
      status: student.status,
      parents: student.parents.map(link => ({
        id: link.parent.id,
        name: `${link.parent.firstName} ${link.parent.lastName}`,
        whatsappNumber: link.parent.whatsappNumber,
        relationship: link.relationship
      })),
      fee: balances ? (balances.get(student.id) ?? emptyBalance()) : null
    }))
  }
})
