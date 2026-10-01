import type { Prisma } from '@prisma/client'
import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { announcementListQuery, contains, searchWhere } from '../../validators/lists'
import { deliveryStats } from '../../services/announcement.service'

export default defineEventHandler(async (event) => {
  await requireSection(event, 'announcements')
  const query = await getValidatedQuery(event, announcementListQuery.parse)

  const where: Prisma.AnnouncementWhereInput = {
    ...(query.status !== 'ALL' && { status: query.status }),
    ...searchWhere(query.search, term => [{ title: contains(term) }, { message: contains(term) }, { targetClass: contains(term) }])
  }

  const [announcements, statusCounts, allParents] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { name: true } },
        targetStudent: { select: { firstName: true, lastName: true, className: true } }
      }
    }),
    prisma.announcement.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.parent.count({ where: { status: 'ACTIVE' } })
  ])

  // Estimated reach: how many active parents the announcement goes to.
  const classes = [...new Set(announcements.filter(item => item.targetType === 'CLASS' && item.targetClass).map(item => item.targetClass!))]
  const classReach = new Map<string, number>()
  await Promise.all(classes.map(async (className) => {
    classReach.set(className, await prisma.parent.count({
      where: { status: 'ACTIVE', children: { some: { student: { className, status: 'ACTIVE' } } } }
    }))
  }))
  const studentIds = announcements.filter(item => item.targetType === 'STUDENT' && item.targetStudentId).map(item => item.targetStudentId!)
  const studentReach = new Map<string, number>()
  if (studentIds.length) {
    const links = await prisma.parentStudent.groupBy({ by: ['studentId'], _count: { _all: true }, where: { studentId: { in: studentIds } } })
    for (const link of links) studentReach.set(link.studentId, link._count._all)
  }

  const stats = await deliveryStats(announcements.map(item => item.id))

  return {
    counts: Object.fromEntries(statusCounts.map(row => [row.status, row._count._all])) as Partial<Record<'PUBLISHED' | 'DRAFT' | 'ARCHIVED', number>>,
    items: announcements.map(item => ({
      id: item.id,
      title: item.title,
      message: item.message,
      status: item.status,
      targetType: item.targetType,
      targetClass: item.targetClass,
      targetStudentId: item.targetStudentId,
      delivery: stats.get(item.id) ?? null,
      targetLabel: item.targetType === 'ALL'
        ? 'All parents'
        : item.targetType === 'CLASS'
          ? (item.targetClass ?? 'A class')
          : item.targetStudent ? `${item.targetStudent.firstName} ${item.targetStudent.lastName}` : 'One student',
      reach: item.targetType === 'ALL'
        ? allParents
        : item.targetType === 'CLASS'
          ? (classReach.get(item.targetClass ?? '') ?? 0)
          : (studentReach.get(item.targetStudentId ?? '') ?? 0),
      createdBy: item.createdBy.name,
      createdAt: item.createdAt,
      publishedAt: item.publishedAt
    }))
  }
})
