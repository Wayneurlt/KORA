import { describe, expect, it } from 'vitest'
import { announcementSchema, feeChargeSchema, parentSchema, passwordChangeSchema, paymentCreateSchema, scoresSchema, studentSchema } from '../server/validators/forms'

describe('paymentCreateSchema', () => {
  const base = { studentId: 'student-1', amount: 1500, paymentMethod: 'MPESA' }

  it('accepts a minimal payment and defaults to completed', () => {
    const result = paymentCreateSchema.parse(base)
    expect(result.status).toBe('COMPLETED')
    expect(result.paymentReference).toBeNull()
  })

  it('rejects zero, negative or absurd amounts', () => {
    expect(paymentCreateSchema.safeParse({ ...base, amount: 0 }).success).toBe(false)
    expect(paymentCreateSchema.safeParse({ ...base, amount: -5 }).success).toBe(false)
    expect(paymentCreateSchema.safeParse({ ...base, amount: 50_000_000 }).success).toBe(false)
  })

  it('rejects payment dates in the future', () => {
    const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(paymentCreateSchema.safeParse({ ...base, paymentDate: tomorrow }).success).toBe(false)
  })
})

describe('parentSchema', () => {
  it('normalises the WhatsApp number', () => {
    const parent = parentSchema.parse({ firstName: 'Jane', lastName: 'Doe', whatsappNumber: '0712 345 678' })
    expect(parent.whatsappNumber).toBe('254712345678')
    expect(parent.email).toBeNull()
  })

  it('rejects numbers that cannot be valid', () => {
    const result = parentSchema.safeParse({ firstName: 'Jane', lastName: 'Doe', whatsappNumber: '123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/valid phone number/)
  })
})

describe('studentSchema', () => {
  it('upper-cases admission numbers', () => {
    expect(studentSchema.parse({ admissionNumber: 'kor-1011', firstName: 'A', lastName: 'B', className: 'Grade 4' }).admissionNumber).toBe('KOR-1011')
  })
})

describe('announcementSchema', () => {
  const base = { title: 'Notice', message: 'Hello parents' }

  it('requires a class for class announcements and a student for family ones', () => {
    expect(announcementSchema.safeParse({ ...base, targetType: 'CLASS' }).success).toBe(false)
    expect(announcementSchema.safeParse({ ...base, targetType: 'CLASS', targetClass: 'Grade 4' }).success).toBe(true)
    expect(announcementSchema.safeParse({ ...base, targetType: 'STUDENT' }).success).toBe(false)
  })

  it('caps the message at the WhatsApp template parameter limit', () => {
    expect(announcementSchema.safeParse({ ...base, targetType: 'ALL', message: 'x'.repeat(1001) }).success).toBe(false)
  })
})

describe('feeChargeSchema', () => {
  it('needs a class or a student depending on the target', () => {
    const base = { description: 'Tuition', term: 'Term 3', academicYear: '2026', amount: 18500 }
    expect(feeChargeSchema.safeParse({ ...base, target: 'CLASS' }).success).toBe(false)
    expect(feeChargeSchema.safeParse({ ...base, target: 'CLASS', className: 'Grade 4' }).success).toBe(true)
    expect(feeChargeSchema.safeParse({ ...base, target: 'STUDENT', studentId: 's1' }).success).toBe(true)
    expect(feeChargeSchema.safeParse({ ...base, target: 'CLASS', className: 'Grade 4', academicYear: '26' }).success).toBe(false)
  })
})

describe('scoresSchema', () => {
  it('accepts 0–100 and null (clear), rejects anything else', () => {
    const entry = (score: number | null) => ({ examId: 'e1', scores: [{ studentId: 's1', subjectId: 'm1', score }] })
    expect(scoresSchema.safeParse(entry(0)).success).toBe(true)
    expect(scoresSchema.safeParse(entry(100)).success).toBe(true)
    expect(scoresSchema.safeParse(entry(null)).success).toBe(true)
    expect(scoresSchema.safeParse(entry(101)).success).toBe(false)
    expect(scoresSchema.safeParse(entry(-1)).success).toBe(false)
  })
})

describe('passwordChangeSchema', () => {
  it('requires 8+ characters with letters and a number', () => {
    const check = (newPassword: string) => passwordChangeSchema.safeParse({ currentPassword: 'old', newPassword }).success
    expect(check('Teacher2026')).toBe(true)
    expect(check('short1')).toBe(false)
    expect(check('onlyletters')).toBe(false)
    expect(check('12345678')).toBe(false)
  })
})
