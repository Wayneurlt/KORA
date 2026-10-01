import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { scoresSchema } from '../../validators/forms'
import { gradeForScore } from '../../services/grading'

// Saves a batch of scores. Grades are always worked out here from the school's
// grade bands, never trusted from the browser. A null score clears the entry.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'results')
  const input = await parseBody(event, scoresSchema)

  const [exam, settings] = await Promise.all([
    prisma.exam.findUnique({ where: { id: input.examId }, select: { id: true, status: true } }),
    prisma.schoolSettings.findFirst({ include: { gradeBands: true } })
  ])
  if (!exam) throw createError({ statusCode: 404, statusMessage: 'Exam not found.' })
  if (exam.status === 'ARCHIVED') throw createError({ statusCode: 409, statusMessage: 'Archived exams can\'t be changed.' })

  const bands = settings?.gradeBands ?? []
  const toSave = input.scores.filter(entry => entry.score !== null)
  const toClear = input.scores.filter(entry => entry.score === null)

  await prisma.$transaction([
    ...toSave.map(entry => prisma.result.upsert({
      where: { studentId_examId_subjectId: { studentId: entry.studentId, examId: exam.id, subjectId: entry.subjectId } },
      update: { score: entry.score!, grade: gradeForScore(entry.score!, bands) },
      create: { studentId: entry.studentId, examId: exam.id, subjectId: entry.subjectId, score: entry.score!, grade: gradeForScore(entry.score!, bands) }
    })),
    ...(toClear.length
      ? [prisma.result.deleteMany({ where: { examId: exam.id, OR: toClear.map(entry => ({ studentId: entry.studentId, subjectId: entry.subjectId })) } })]
      : [])
  ])

  await logAudit({
    userId: user.id,
    action: 'results.saved',
    entity: 'Exam',
    entityId: exam.id,
    metadata: { saved: toSave.length, cleared: toClear.length, published: exam.status === 'PUBLISHED' }
  })
  return { saved: toSave.length, cleared: toClear.length }
})
