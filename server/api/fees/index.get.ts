import type { Prisma } from '@prisma/client'
import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { contains, feeListQuery, searchWhere } from '../../validators/lists'
import { emptyBalance, getFeeBalances } from '../../services/fees.service'

export default defineEventHandler(async (event) => {
  await requireSection(event, 'fees')
  const query = await getValidatedQuery(event, feeListQuery.parse)

  const where: Prisma.StudentWhereInput = {
    status: 'ACTIVE',
    ...(query.className && { className: query.className }),
    ...searchWhere(query.search, term => [
      { firstName: contains(term) },
      { lastName: contains(term) },
      { admissionNumber: contains(term) }
    ])
  }

  // One school's worth of students — balances are computed for all matches,
  // then filtered by status and paginated in memory.
  const [students, allBalances, settings, recent, lastPayments, classes] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: [{ className: 'asc' }, { stream: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, admissionNumber: true, className: true, stream: true }
    }),
    getFeeBalances(),
    prisma.schoolSettings.findFirst({ select: { currency: true } }),
    prisma.payment.findMany({
      orderBy: { paymentDate: 'desc' },
      take: 8,
      include: { student: { select: { id: true, firstName: true, lastName: true, className: true } } }
    }),
    prisma.payment.groupBy({ by: ['studentId'], _max: { paymentDate: true }, where: { status: 'COMPLETED' } }),
    prisma.student.groupBy({ by: ['className'], _count: { _all: true }, where: { status: 'ACTIVE' }, orderBy: { className: 'asc' } })
  ])

  const lastPaid = new Map(lastPayments.map(row => [row.studentId, row._max.paymentDate]))

  const rows = students
    .map(student => ({
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.className,
        stream: student.stream
      },
      ...(allBalances.get(student.id) ?? emptyBalance()),
      lastPaymentAt: lastPaid.get(student.id) ?? null
    }))
    .filter(row => row.status !== 'NO_FEES')

  // School-wide totals (ignore the search / class filters).
  const totals = { billed: 0, collected: 0, pending: 0, outstanding: 0 }
  const counts = { PAID: 0, PARTIAL: 0, UNPAID: 0 }
  for (const balance of allBalances.values()) {
    if (balance.status === 'NO_FEES') continue
    totals.billed += balance.billed
    totals.collected += balance.paid
    totals.pending += balance.pending
    totals.outstanding += balance.balance
    counts[balance.status]++
  }

  const filtered = query.status === 'ALL' ? rows : rows.filter(row => row.status === query.status)

  return {
    currency: settings?.currency ?? 'KES',
    summary: {
      ...totals,
      collectionRate: totals.billed ? Math.round((totals.collected / totals.billed) * 100) : 0,
      counts
    },
    classes: classes.map(row => ({ className: row.className, count: row._count._all })),
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
    items: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    recentPayments: recent.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      method: payment.paymentMethod,
      reference: payment.paymentReference,
      date: payment.paymentDate,
      status: payment.status,
      student: { id: payment.student.id, name: `${payment.student.firstName} ${payment.student.lastName}`, className: payment.student.className }
    }))
  }
})
