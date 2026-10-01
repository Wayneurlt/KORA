import { z } from 'zod'
import { normalizePhone } from '../../shared/phone'

// Request-body schemas for the dashboard's create / update endpoints.

const id = z.string().trim().min(1).max(50)
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal('')).transform(value => value || null)
const optionalDate = z.union([z.coerce.date(), z.literal(''), z.null()]).optional().transform(value => (value instanceof Date ? value : null))
const money = z.coerce.number().positive('Amount must be more than 0').max(10_000_000, 'Amount looks too large')

const phone = (label: string) => z.string().trim().min(1, `${label} is required`).transform((value, ctx) => {
  const normalized = normalizePhone(value)
  if (!normalized) {
    ctx.addIssue({ code: 'custom', message: `${label} doesn't look like a valid phone number` })
    return z.NEVER
  }
  return normalized
})

// Fees --------------------------------------------------------------------

export const paymentCreateSchema = z.object({
  studentId: id,
  amount: money,
  paymentMethod: z.enum(['MPESA', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER']),
  paymentReference: optionalText(100),
  paymentDate: optionalDate,
  status: z.enum(['COMPLETED', 'PENDING']).default('COMPLETED')
}).refine(input => !input.paymentDate || input.paymentDate.getTime() <= Date.now() + 60 * 60 * 1000, {
  message: 'Payment date can\'t be in the future',
  path: ['paymentDate']
})

export const paymentUpdateSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED', 'REFUNDED'])
})

export const feeChargeSchema = z.object({
  target: z.enum(['STUDENT', 'CLASS']),
  studentId: id.optional(),
  className: z.string().trim().max(50).optional(),
  description: z.string().trim().min(1, 'Description is required').max(120),
  term: z.string().trim().min(1, 'Term is required').max(30),
  academicYear: z.string().trim().regex(/^\d{4}$/, 'Academic year should look like 2026'),
  amount: money,
  dueDate: optionalDate
}).refine(input => (input.target === 'STUDENT' ? !!input.studentId : !!input.className), {
  message: 'Choose who to bill'
})

// Students & parents ------------------------------------------------------

export const studentSchema = z.object({
  admissionNumber: z.string().trim().min(1, 'Admission number is required').max(30).toUpperCase(),
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  className: z.string().trim().min(1, 'Class is required').max(50),
  stream: optionalText(20),
  dateOfBirth: optionalDate,
  status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED']).default('ACTIVE')
})

export const parentSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  whatsappNumber: phone('WhatsApp number'),
  phoneNumber: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')).transform(value => value || null),
  children: z.array(z.object({ studentId: id, relationship: z.string().trim().min(1).max(30).default('Parent') })).max(10).default([])
})

export const parentLinkSchema = z.object({
  parentId: id,
  relationship: z.string().trim().min(1).max(30).default('Parent')
})

// Announcements -----------------------------------------------------------

export const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  // WhatsApp template parameters are capped at 1024 characters.
  message: z.string().trim().min(1, 'Message is required').max(1000, 'Keep the message under 1000 characters'),
  targetType: z.enum(['ALL', 'CLASS', 'STUDENT']),
  targetClass: z.string().trim().max(50).optional().nullable(),
  targetStudentId: id.optional().nullable()
}).refine(input => input.targetType !== 'CLASS' || !!input.targetClass, { message: 'Choose a class', path: ['targetClass'] })
  .refine(input => input.targetType !== 'STUDENT' || !!input.targetStudentId, { message: 'Choose a student', path: ['targetStudentId'] })

// Exams & results ---------------------------------------------------------

export const examSchema = z.object({
  name: z.string().trim().min(1, 'Exam name is required').max(80),
  term: z.string().trim().min(1, 'Term is required').max(30),
  academicYear: z.string().trim().regex(/^\d{4}$/, 'Academic year should look like 2026'),
  startDate: optionalDate,
  endDate: optionalDate
})

export const examStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
})

export const scoresSchema = z.object({
  examId: id,
  scores: z.array(z.object({
    studentId: id,
    subjectId: id,
    // null clears a previously entered score
    score: z.number().min(0, 'Scores can\'t be below 0').max(100, 'Scores can\'t be above 100').nullable()
  })).max(5000)
})

// Conversations -----------------------------------------------------------

export const replySchema = z.object({
  content: z.string().trim().min(1, 'Type a message').max(4096)
})

export const conversationUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  assignedToId: id.nullable().optional()
})

// Staff & account ---------------------------------------------------------

export const staffCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(['ADMIN', 'FINANCE', 'ACADEMIC', 'SUPPORT'])
})

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'FINANCE', 'ACADEMIC', 'SUPPORT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Use at least 8 characters').max(200)
    .refine(value => /[a-zA-Z]/.test(value) && /\d/.test(value), 'Use letters and at least one number')
})
