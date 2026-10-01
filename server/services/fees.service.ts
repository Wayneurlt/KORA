import { prisma } from '../utils/prisma'

export type FeeStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'NO_FEES'

export interface FeeBalance {
  billed: number
  paid: number
  /** M-Pesa / other payments recorded but not yet confirmed — not counted as paid */
  pending: number
  balance: number
  status: FeeStatus
}

export function feeStatus(billed: number, paid: number, pending: number): FeeStatus {
  if (billed <= 0) return 'NO_FEES'
  if (paid >= billed) return 'PAID'
  if (paid > 0 || pending > 0) return 'PARTIAL'
  return 'UNPAID'
}

/**
 * Server-calculated balance per student: active fee records minus completed
 * payments. This is the single source of truth for every screen that shows
 * a fee balance.
 */
export async function getFeeBalances(studentIds?: string[]) {
  const scope = studentIds ? { studentId: { in: studentIds } } : {}

  const [billed, paid, pending] = await Promise.all([
    prisma.feeRecord.groupBy({ by: ['studentId'], _sum: { amount: true }, where: { status: 'ACTIVE', ...scope } }),
    prisma.payment.groupBy({ by: ['studentId'], _sum: { amount: true }, where: { status: 'COMPLETED', ...scope } }),
    prisma.payment.groupBy({ by: ['studentId'], _sum: { amount: true }, where: { status: 'PENDING', ...scope } })
  ])

  const sum = (rows: typeof billed) => new Map(rows.map(row => [row.studentId, row._sum.amount ?? 0]))
  const billedBy = sum(billed)
  const paidBy = sum(paid)
  const pendingBy = sum(pending)

  const ids = studentIds ?? [...new Set([...billedBy.keys(), ...paidBy.keys(), ...pendingBy.keys()])]
  const balances = new Map<string, FeeBalance>()
  for (const id of ids) {
    const b = billedBy.get(id) ?? 0
    const p = paidBy.get(id) ?? 0
    const pe = pendingBy.get(id) ?? 0
    balances.set(id, { billed: b, paid: p, pending: pe, balance: Math.max(b - p, 0), status: feeStatus(b, p, pe) })
  }
  return balances
}

export function emptyBalance(): FeeBalance {
  return { billed: 0, paid: 0, pending: 0, balance: 0, status: 'NO_FEES' }
}
