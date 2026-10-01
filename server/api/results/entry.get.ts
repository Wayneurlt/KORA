import { z } from 'zod'
import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'

// Score-entry grid: every active student in a class × every active subject.
const query = z.object({
  examId: z.string().trim().min(1).max(50),
  className: z.string().trim().min(1).max(50)
})

export default defineEventHandler(async (event) => {
  await requireManage(event, 'results')
  const { examId, className } = await getValidatedQuery(event, query.parse)

  const [exam, subjects, students] = await Promise.all([
    prisma.exam.findUnique({ where: { id: examId } }),
    prisma.subject.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
    prisma.student.findMany({
      where: { className, status: 'ACTIVE' },
      orderBy: [{ stream: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        stream: true,
        results: { where: { examId }, select: { subjectId: true, score: true } }
      }
    })
  ])
  if (!exam) throw createError({ statusCode: 404, statusMessage: 'Exam not found.' })

  return {
    exam: { id: exam.id, name: exam.name, term: exam.term, academicYear: exam.academicYear, status: exam.status },
    subjects,
    students: students.map(student => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      stream: student.stream,
      scores: Object.fromEntries(student.results.map(result => [result.subjectId, result.score])) as Record<string, number>
    }))
  }
})
