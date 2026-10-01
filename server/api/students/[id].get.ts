import { canAccessSection } from '../../../shared/access'
import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { emptyBalance, getFeeBalances } from '../../services/fees.service'

export default defineEventHandler(async (event) => {
  const user = await requireSection(event, 'students')
  const id = getRouterParam(event, 'id')!

  const canResults = canAccessSection(user.role, 'results')
  const canFees = canAccessSection(user.role, 'fees')

  // Everything in one round of parallel queries — the database may be remote.
  const [student, resultRows, records, payments, balances] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        parents: {
          include: {
            parent: {
              select: { id: true, firstName: true, lastName: true, whatsappNumber: true, phoneNumber: true, email: true, verificationStatus: true }
            }
          }
        }
      }
    }),
    canResults
      ? prisma.result.findMany({
          where: { studentId: id },
          include: { exam: true, subject: { select: { name: true, code: true } } },
          orderBy: [{ exam: { createdAt: 'desc' } }, { subject: { name: 'asc' } }]
        })
      : null,
    canFees ? prisma.feeRecord.findMany({ where: { studentId: id, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } }) : null,
    canFees ? prisma.payment.findMany({ where: { studentId: id }, orderBy: { paymentDate: 'desc' } }) : null,
    canFees ? getFeeBalances([id]) : null
  ])
  if (!student) throw createError({ statusCode: 404, statusMessage: 'Student not found.' })

  let results = null
  if (resultRows) {
    const byExam = new Map<string, { exam: typeof resultRows[number]['exam'], subjects: { name: string, code: string, score: number, grade: string | null, comment: string | null }[] }>()
    for (const row of resultRows) {
      const group = byExam.get(row.examId) ?? { exam: row.exam, subjects: [] }
      group.subjects.push({ name: row.subject.name, code: row.subject.code, score: row.score, grade: row.grade, comment: row.teacherComment })
      byExam.set(row.examId, group)
    }
    results = [...byExam.values()].map(group => ({
      exam: { id: group.exam.id, name: group.exam.name, term: group.exam.term, academicYear: group.exam.academicYear, status: group.exam.status },
      subjects: group.subjects,
      average: Math.round((group.subjects.reduce((sum, subject) => sum + subject.score, 0) / group.subjects.length) * 10) / 10
    }))
  }

  const fees = records && payments && balances
    ? {
        summary: balances.get(id) ?? emptyBalance(),
        records: records.map(record => ({ id: record.id, description: record.description, term: record.term, academicYear: record.academicYear, amount: record.amount, dueDate: record.dueDate })),
        payments: payments.map(payment => ({ id: payment.id, amount: payment.amount, method: payment.paymentMethod, reference: payment.paymentReference, date: payment.paymentDate, status: payment.status }))
      }
    : null

  return {
    id: student.id,
    admissionNumber: student.admissionNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    className: student.className,
    stream: student.stream,
    status: student.status,
    dateOfBirth: student.dateOfBirth,
    createdAt: student.createdAt,
    parents: student.parents.map(link => ({
      id: link.parent.id,
      name: `${link.parent.firstName} ${link.parent.lastName}`,
      relationship: link.relationship,
      whatsappNumber: link.parent.whatsappNumber,
      phoneNumber: link.parent.phoneNumber,
      email: link.parent.email,
      verificationStatus: link.parent.verificationStatus
    })),
    results,
    fees
  }
})
