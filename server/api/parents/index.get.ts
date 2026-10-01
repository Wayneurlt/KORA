import type { Prisma } from '@prisma/client'
import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { contains, parentListQuery, searchWhere } from '../../validators/lists'

// Parents are managed alongside students (same "students" section).
export default defineEventHandler(async (event) => {
  await requireSection(event, 'students')
  const query = await getValidatedQuery(event, parentListQuery.parse)

  const where: Prisma.ParentWhereInput = {
    status: 'ACTIVE',
    ...(query.verification !== 'ALL' && { verificationStatus: query.verification }),
    ...searchWhere(query.search, term => [
      { firstName: contains(term) },
      { lastName: contains(term) },
      { whatsappNumber: contains(term) },
      { email: contains(term) },
      { children: { some: { student: { OR: [{ firstName: contains(term) }, { lastName: contains(term) }, { admissionNumber: contains(term) }] } } } }
    ])
  }

  const [total, parents, verification] = await Promise.all([
    prisma.parent.count({ where }),
    prisma.parent.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        children: { include: { student: { select: { id: true, firstName: true, lastName: true, className: true, stream: true } } } },
        messages: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 }
      }
    }),
    prisma.parent.groupBy({ by: ['verificationStatus'], _count: { _all: true }, where: { status: 'ACTIVE' } })
  ])

  return {
    total,
    page: query.page,
    pageSize: query.pageSize,
    counts: Object.fromEntries(verification.map(row => [row.verificationStatus, row._count._all])) as Partial<Record<'VERIFIED' | 'PENDING' | 'UNVERIFIED', number>>,
    items: parents.map(parent => ({
      id: parent.id,
      name: `${parent.firstName} ${parent.lastName}`,
      whatsappNumber: parent.whatsappNumber,
      phoneNumber: parent.phoneNumber,
      email: parent.email,
      verificationStatus: parent.verificationStatus,
      lastMessageAt: parent.messages[0]?.createdAt ?? null,
      children: parent.children.map(link => ({
        id: link.student.id,
        name: `${link.student.firstName} ${link.student.lastName}`,
        className: link.student.className,
        stream: link.student.stream
      }))
    }))
  }
})
