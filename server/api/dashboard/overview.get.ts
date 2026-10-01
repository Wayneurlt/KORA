import { canAccessSection } from '../../../shared/access'
import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { getFeeBalances } from '../../services/fees.service'

export default defineEventHandler(async (event) => {
  const user = await requireSection(event, 'dashboard')
  const can = (section: Parameters<typeof canAccessSection>[1]) => canAccessSection(user.role, section)

  const settings = await prisma.schoolSettings.findFirst({ select: { currency: true } })
  const currency = settings?.currency ?? 'KES'

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [studentCount, studentsThisMonth, parentCount, parentsThisMonth, staff] = await Promise.all([
    prisma.student.count({ where: { status: 'ACTIVE' } }),
    prisma.student.count({ where: { status: 'ACTIVE', createdAt: { gte: monthStart } } }),
    prisma.parent.count({ where: { status: 'ACTIVE' } }),
    prisma.parent.count({ where: { status: 'ACTIVE', createdAt: { gte: monthStart } } }),
    prisma.user.findMany({
      select: { id: true, name: true, role: true, status: true },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 6
    })
  ])

  let fees = null
  if (can('fees')) {
    const [balances, paymentsThisMonth] = await Promise.all([
      getFeeBalances(),
      prisma.payment.count({ where: { status: 'COMPLETED', paymentDate: { gte: monthStart } } })
    ])
    fees = { billed: 0, collected: 0, pending: 0, outstanding: 0, paymentsThisMonth }
    for (const balance of balances.values()) {
      fees.billed += balance.billed
      fees.collected += balance.paid
      fees.pending += balance.pending
      fees.outstanding += balance.balance
    }
  }

  let announcements = null
  let nextDraft = null
  if (can('announcements')) {
    const [recent, draft] = await Promise.all([
      prisma.announcement.findMany({
        select: { id: true, title: true, status: true, targetType: true, publishedAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.announcement.findFirst({
        where: { status: 'DRAFT' },
        select: { id: true, title: true, message: true, targetType: true, targetClass: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      })
    ])
    announcements = recent
    nextDraft = draft
  }

  return {
    currency,
    studentCount,
    studentsThisMonth,
    parentCount,
    parentsThisMonth,
    staff,
    fees,
    announcements,
    nextDraft
  }
})
