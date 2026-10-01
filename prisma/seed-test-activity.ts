import { existsSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

if (existsSync('.env')) process.loadEnvFile('.env')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Test activity for the dashboard and the Results / Fees / Announcements /
// Conversations screens: exams + results, fee records + payments,
// announcements, and parent conversations with messages.
//
// Runs on top of prisma/seed.ts (and optionally seed-test-students.ts). Every
// row gets a deterministic id, so re-running updates the same rows instead of
// duplicating them. Dates are relative to "now" so the data always looks recent.

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()
const daysAgo = (days: number, hour = 10, minute = 0) => {
  const date = new Date(now - days * DAY)
  date.setHours(hour, minute, 0, 0)
  // "Today at 4pm" may still be in the future — pull it back to earlier today.
  if (days >= 0 && date.getTime() > now) date.setTime(now - (((hour * 60 + minute) % 150) + 5) * 60 * 1000)
  return date
}

// Small deterministic PRNG so scores and payment patterns are stable between runs.
function rng(seed: string) {
  let h = 2166136261
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const ACADEMIC_YEAR = '2026'

const EXAMS = [
  { id: 'seed-exam-2026-t2-end', name: 'End of Term 2 Exam', term: 'Term 2', status: 'PUBLISHED' as const, start: 70, end: 66 },
  { id: 'seed-exam-2026-t3-opener', name: 'Term 3 Opener', term: 'Term 3', status: 'DRAFT' as const, start: 9, end: 7 }
]

const TEACHER_COMMENTS: Record<string, string[]> = {
  A: ['Excellent work — keep it up!', 'Outstanding performance this term.'],
  B: ['Very good effort.', 'Good progress, aim higher next term.'],
  C: ['Fair performance, more practice needed.', 'Steady work — keep pushing.'],
  D: ['Needs more effort and revision.', 'Can do better with consistent practice.'],
  E: ['Requires extra support — please see the class teacher.', 'Below expectations; let us work on this together.']
}

function tuitionFor(className: string) {
  const grade = Number(className.replace(/\D/g, '')) || 1
  if (grade <= 3) return 18500
  if (grade <= 6) return 22000
  return 26500
}

const METHODS = ['MPESA', 'MPESA', 'MPESA', 'BANK_TRANSFER', 'CASH'] as const

const ANNOUNCEMENTS = [
  { id: 'seed-ann-term3-opening', title: 'Term 3 opening date', message: 'Dear parents, Term 3 begins on Monday. Learners should report by 7:30am in full uniform. Welcome back!', status: 'PUBLISHED' as const, targetType: 'ALL' as const, days: 6 },
  { id: 'seed-ann-g6-results', title: 'Grade 6 results are out', message: 'End of Term 2 results for Grade 6 are now available. Reply RESULTS on WhatsApp to view your child\'s report.', status: 'PUBLISHED' as const, targetType: 'CLASS' as const, targetClass: 'Grade 6', days: 4 },
  { id: 'seed-ann-fee-reminder', title: 'Fee balance reminder', message: 'A friendly reminder that Term 3 fees are due by the 15th. Reply BALANCE to check what is outstanding, or pay via M-Pesa.', status: 'PUBLISHED' as const, targetType: 'ALL' as const, days: 2 },
  { id: 'seed-ann-sports-day', title: 'Sports day schedule', message: 'Our annual sports day is on Friday 16th from 8am. Parents are welcome to attend. Learners should come in their house colours.', status: 'DRAFT' as const, targetType: 'ALL' as const, days: 1 },
  { id: 'seed-ann-ptm-g4', title: 'Parent-teacher meeting', message: 'Dear parents, the Grade 4 parent-teacher meeting is on Friday at 2pm in the main hall. Please confirm attendance by replying YES.', status: 'DRAFT' as const, targetType: 'CLASS' as const, targetClass: 'Grade 4', days: 0 },
  { id: 'seed-ann-midterm-break', title: 'Mid-term break', message: 'The school will close for mid-term break next Thursday and reopen the following Monday.', status: 'ARCHIVED' as const, targetType: 'ALL' as const, days: 40 }
]

type Line = [direction: 'IN' | 'OUT', text: string, minutesAfterStart: number]

const CONVERSATIONS: { category: 'FINANCE' | 'ACADEMIC' | 'GENERAL' | 'TALK_TO_SCHOOL', status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED', assign: boolean, days: number, lines: Line[] }[] = [
  { category: 'FINANCE', status: 'OPEN', assign: false, days: 0, lines: [['IN', 'Hello, what is my fee balance for this term?', 0], ['OUT', 'Hi! Your current balance is shown below. You can pay via M-Pesa paybill anytime.', 1], ['IN', 'I paid yesterday via M-Pesa but it is not showing.', 25]] },
  { category: 'ACADEMIC', status: 'IN_PROGRESS', assign: true, days: 1, lines: [['IN', 'Good morning, can I see the Term 2 results?', 0], ['OUT', 'Good morning! Here are the published End of Term 2 results.', 1], ['IN', 'Thank you. Can I talk to the class teacher about Maths?', 12], ['OUT', 'Sure — I have asked the class teacher to call you this afternoon.', 40]] },
  { category: 'TALK_TO_SCHOOL', status: 'OPEN', assign: false, days: 1, lines: [['IN', 'My child will be absent tomorrow, she has a clinic appointment.', 0]] },
  { category: 'GENERAL', status: 'RESOLVED', assign: true, days: 2, lines: [['IN', 'When does Term 3 start?', 0], ['OUT', 'Term 3 begins on Monday. Learners report by 7:30am.', 3], ['IN', 'Perfect, thank you!', 10]] },
  { category: 'FINANCE', status: 'IN_PROGRESS', assign: true, days: 3, lines: [['IN', 'Can I pay the fees in two instalments?', 0], ['OUT', 'Yes, that is possible. Our finance office will confirm the dates with you.', 20], ['IN', 'Okay, waiting.', 35]] },
  { category: 'ACADEMIC', status: 'CLOSED', assign: true, days: 5, lines: [['IN', 'Is there a parent-teacher meeting this term?', 0], ['OUT', 'Yes, dates will be shared through an announcement soon.', 15]] },
  { category: 'GENERAL', status: 'OPEN', assign: false, days: 0, lines: [['IN', 'Hi, what time do learners close on Friday?', 0]] },
  { category: 'TALK_TO_SCHOOL', status: 'RESOLVED', assign: true, days: 6, lines: [['IN', 'I would like to update my phone number.', 0], ['OUT', 'No problem — please share the new number and we will update your record.', 8], ['IN', 'It is the same as this WhatsApp number. Thanks.', 14], ['OUT', 'Done. Your record is updated.', 30]] }
]

async function main() {
  const [admin, support, settings] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } }),
    prisma.user.findFirst({ where: { role: 'SUPPORT' }, orderBy: { createdAt: 'asc' } }),
    prisma.schoolSettings.findFirst({ include: { gradeBands: true } })
  ])
  if (!admin || !settings) throw new Error('Run `npm run db:seed` first — no admin user or school settings found.')

  const students = await prisma.student.findMany({ where: { status: 'ACTIVE' }, orderBy: { admissionNumber: 'asc' } })
  const subjects = await prisma.subject.findMany({ where: { status: 'ACTIVE' } })
  const parents = await prisma.parent.findMany({ where: { status: 'ACTIVE' }, orderBy: { whatsappNumber: 'asc' } })
  if (!students.length) throw new Error('No students found — run `npm run db:seed` first.')

  const bands = [...settings.gradeBands].sort((a, b) => b.minScore - a.minScore)
  const gradeFor = (score: number) => bands.find(band => score >= band.minScore)?.grade ?? 'E'

  // Exams and results ------------------------------------------------------
  console.log(`Seeding ${EXAMS.length} exams with results for ${students.length} students...`)
  for (const exam of EXAMS) {
    await prisma.exam.upsert({
      where: { id: exam.id },
      update: { name: exam.name, term: exam.term, status: exam.status },
      create: { id: exam.id, name: exam.name, term: exam.term, academicYear: ACADEMIC_YEAR, status: exam.status, startDate: daysAgo(exam.start), endDate: daysAgo(exam.end) }
    })

    // The draft opener only has results for the first half of students (entry in progress).
    const examStudents = exam.status === 'DRAFT' ? students.slice(0, Math.ceil(students.length / 2)) : students
    for (const student of examStudents) {
      const ability = 45 + rng(student.admissionNumber)() * 45
      for (const subject of subjects) {
        const random = rng(`${exam.id}:${student.admissionNumber}:${subject.code}`)
        const score = Math.round(Math.min(99, Math.max(28, ability + (random() - 0.5) * 24)))
        const grade = gradeFor(score)
        const comments = TEACHER_COMMENTS[grade] ?? TEACHER_COMMENTS.C!
        await prisma.result.upsert({
          where: { studentId_examId_subjectId: { studentId: student.id, examId: exam.id, subjectId: subject.id } },
          update: { score, grade },
          create: { studentId: student.id, examId: exam.id, subjectId: subject.id, score, grade, teacherComment: comments[Math.floor(random() * comments.length)] }
        })
      }
    }
  }

  // Fees and payments ------------------------------------------------------
  console.log('Seeding Term 3 fee records and payments...')
  let paymentCount = 0
  for (const [index, student] of students.entries()) {
    const random = rng(`fees:${student.admissionNumber}`)
    const tuition = tuitionFor(student.className)
    const takesTransport = index % 3 === 0
    const billed = tuition + (takesTransport ? 6000 : 0)

    await prisma.feeRecord.upsert({
      where: { id: `seed-fee-${student.admissionNumber}-t3-tuition` },
      update: { amount: tuition },
      create: { id: `seed-fee-${student.admissionNumber}-t3-tuition`, studentId: student.id, academicYear: ACADEMIC_YEAR, term: 'Term 3', description: 'Term 3 Tuition', amount: tuition, dueDate: daysAgo(-13) }
    })
    if (takesTransport) {
      await prisma.feeRecord.upsert({
        where: { id: `seed-fee-${student.admissionNumber}-t3-transport` },
        update: { amount: 6000 },
        create: { id: `seed-fee-${student.admissionNumber}-t3-transport`, studentId: student.id, academicYear: ACADEMIC_YEAR, term: 'Term 3', description: 'Term 3 Transport', amount: 6000, dueDate: daysAgo(-13) }
      })
    }

    // ~40% paid in full, ~30% part-paid, ~10% M-Pesa pending confirmation, ~20% nothing yet.
    const roll = random()
    const plan: { amount: number, status: 'COMPLETED' | 'PENDING', days: number }[] = []
    if (roll < 0.4) {
      plan.push({ amount: billed, status: 'COMPLETED', days: Math.floor(random() * 25) })
    } else if (roll < 0.7) {
      const first = Math.round((billed * (0.3 + random() * 0.3)) / 500) * 500
      plan.push({ amount: first, status: 'COMPLETED', days: 10 + Math.floor(random() * 15) })
      if (random() < 0.5) plan.push({ amount: Math.round((billed * 0.15) / 500) * 500, status: 'COMPLETED', days: Math.floor(random() * 3) })
    } else if (roll < 0.8) {
      plan.push({ amount: Math.round((billed * 0.5) / 500) * 500, status: 'PENDING', days: 0 })
    }

    for (const [n, payment] of plan.entries()) {
      const method = payment.status === 'PENDING' ? 'MPESA' : METHODS[Math.floor(random() * METHODS.length)]!
      const reference = method === 'MPESA'
        ? `S${student.admissionNumber.replace(/\D/g, '')}${n}K${Math.floor(random() * 9000 + 1000)}`
        : method === 'BANK_TRANSFER' ? `BT-${Math.floor(random() * 900000 + 100000)}` : null
      const paymentDate = daysAgo(payment.days, 9 + Math.floor(random() * 8), Math.floor(random() * 60))
      await prisma.payment.upsert({
        where: { id: `seed-pay-${student.admissionNumber}-t3-${n}` },
        update: { amount: payment.amount, status: payment.status, paymentDate },
        create: {
          id: `seed-pay-${student.admissionNumber}-t3-${n}`,
          studentId: student.id,
          amount: payment.amount,
          paymentMethod: method,
          paymentReference: reference,
          paymentDate,
          status: payment.status
        }
      })
      paymentCount++
    }
  }

  // Announcements ----------------------------------------------------------
  console.log(`Seeding ${ANNOUNCEMENTS.length} announcements...`)
  for (const announcement of ANNOUNCEMENTS) {
    const created = daysAgo(announcement.days + 1, 15)
    const data = {
      title: announcement.title,
      message: announcement.message,
      status: announcement.status,
      targetType: announcement.targetType,
      targetClass: 'targetClass' in announcement ? announcement.targetClass : null,
      publishedAt: announcement.status === 'DRAFT' ? null : daysAgo(announcement.days, 8, 30)
    }
    await prisma.announcement.upsert({
      where: { id: announcement.id },
      update: data,
      create: { id: announcement.id, ...data, createdById: admin.id, createdAt: created }
    })
  }

  // Conversations and messages --------------------------------------------
  const conversationCount = Math.min(CONVERSATIONS.length, parents.length)
  console.log(`Seeding ${conversationCount} parent conversations...`)
  for (const [index, convo] of CONVERSATIONS.slice(0, conversationCount).entries()) {
    const parent = parents[index]!
    const id = `seed-convo-${index + 1}`
    const start = daysAgo(convo.days, 8 + index, 15)
    const assignedToId = convo.assign && support ? support.id : null

    await prisma.conversation.upsert({
      where: { id },
      update: { status: convo.status, category: convo.category, assignedToId, createdAt: start },
      create: { id, parentId: parent.id, category: convo.category, status: convo.status, assignedToId, createdAt: start }
    })

    for (const [n, [direction, content, minutes]] of convo.lines.entries()) {
      const inbound = direction === 'IN'
      const isLast = n === convo.lines.length - 1
      await prisma.message.upsert({
        where: { id: `${id}-msg-${n + 1}` },
        update: { content, createdAt: new Date(start.getTime() + minutes * 60 * 1000) },
        create: {
          id: `${id}-msg-${n + 1}`,
          conversationId: id,
          parentId: inbound ? parent.id : null,
          staffId: inbound ? null : (assignedToId ?? admin.id),
          direction: inbound ? 'INBOUND' : 'OUTBOUND',
          content,
          deliveryStatus: inbound ? 'RECEIVED' : isLast ? 'DELIVERED' : 'READ',
          createdAt: new Date(start.getTime() + minutes * 60 * 1000)
        }
      })
    }
  }

  const [results, fees] = await Promise.all([prisma.result.count(), prisma.feeRecord.count()])
  console.log('Done — test activity is ready:')
  console.log(`  ${EXAMS.length} exams, ${results} results`)
  console.log(`  ${fees} fee records, ${paymentCount} payments`)
  console.log(`  ${ANNOUNCEMENTS.length} announcements, ${conversationCount} conversations`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
