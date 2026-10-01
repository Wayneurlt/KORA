import type { Prisma } from '@prisma/client'
import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { contains, resultsQuery, searchWhere } from '../../validators/lists'

const round1 = (value: number) => Math.round(value * 10) / 10

export default defineEventHandler(async (event) => {
  await requireSection(event, 'results')
  const query = await getValidatedQuery(event, resultsQuery.parse)

  const exams = await prisma.exam.findMany({
    where: { status: { not: 'ARCHIVED' } },
    orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { results: true } } }
  })

  // Default to the newest published exam, falling back to the newest exam.
  const exam = exams.find(item => item.id === query.examId)
    ?? exams.find(item => item.status === 'PUBLISHED')
    ?? exams[0]

  const settings = await prisma.schoolSettings.findFirst({ include: { gradeBands: true } })
  const bands = [...(settings?.gradeBands ?? [])].sort((a, b) => b.minScore - a.minScore)
  const gradeFor = (score: number) => bands.find(band => score >= band.minScore)?.grade ?? null

  const examList = exams.map(item => ({
    id: item.id,
    name: item.name,
    term: item.term,
    academicYear: item.academicYear,
    status: item.status,
    resultCount: item._count.results
  }))

  if (!exam) {
    return { exams: examList, exam: null, subjects: [], rows: [], classes: [], summary: null }
  }

  const studentWhere: Prisma.StudentWhereInput = {
    ...(query.className && { className: query.className }),
    ...searchWhere(query.search, term => [
      { firstName: contains(term) },
      { lastName: contains(term) },
      { admissionNumber: contains(term) }
    ])
  }

  const [subjects, results, classRows] = await Promise.all([
    prisma.subject.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } }),
    prisma.result.findMany({
      where: { examId: exam.id, student: studentWhere },
      include: { student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true, className: true, stream: true } } }
    }),
    prisma.result.findMany({
      where: { examId: exam.id },
      distinct: ['studentId'],
      select: { student: { select: { className: true } } }
    })
  ])

  const byStudent = new Map<string, { student: typeof results[number]['student'], scores: Record<string, { score: number, grade: string | null }> }>()
  for (const result of results) {
    const row = byStudent.get(result.studentId) ?? { student: result.student, scores: {} }
    row.scores[result.subjectId] = { score: result.score, grade: result.grade }
    byStudent.set(result.studentId, row)
  }

  const rows = [...byStudent.values()]
    .map((row) => {
      const values = Object.values(row.scores).map(score => score.score)
      const total = values.reduce((sum, value) => sum + value, 0)
      const average = values.length ? round1(total / values.length) : 0
      return {
        student: {
          id: row.student.id,
          name: `${row.student.firstName} ${row.student.lastName}`,
          admissionNumber: row.student.admissionNumber,
          className: row.student.className,
          stream: row.student.stream
        },
        scores: row.scores,
        subjectsEntered: values.length,
        total,
        average,
        grade: gradeFor(average)
      }
    })
    .sort((a, b) => b.average - a.average)
    .map((row, index) => ({ ...row, position: index + 1 }))

  const subjectStats = subjects.map((subject) => {
    const values = rows.map(row => row.scores[subject.id]?.score).filter((value): value is number => value !== undefined)
    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      average: values.length ? round1(values.reduce((sum, value) => sum + value, 0) / values.length) : null
    }
  })

  const classCounts = new Map<string, number>()
  for (const row of classRows) classCounts.set(row.student.className, (classCounts.get(row.student.className) ?? 0) + 1)

  const averages = rows.map(row => row.average)
  const passMark = bands.find(band => band.grade === 'D')?.minScore ?? 50

  return {
    exams: examList,
    exam: examList.find(item => item.id === exam.id)!,
    subjects: subjectStats,
    rows,
    classes: [...classCounts.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([className, count]) => ({ className, count })),
    summary: rows.length
      ? {
          students: rows.length,
          average: round1(averages.reduce((sum, value) => sum + value, 0) / averages.length),
          passRate: Math.round((averages.filter(value => value >= passMark).length / averages.length) * 100),
          passMark,
          top: rows[0]!.student.name,
          topAverage: rows[0]!.average
        }
      : null
  }
})
