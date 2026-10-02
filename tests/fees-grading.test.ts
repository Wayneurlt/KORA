import { describe, expect, it, vi } from 'vitest'
import { gradeForScore } from '../server/services/grading'

// fees.service imports the Prisma client; the status logic under test doesn't need it.
vi.mock('../server/utils/prisma', () => ({ prisma: {} }))
const { feeStatus } = await import('../server/services/fees.service')

describe('feeStatus', () => {
  it('is NO_FEES when nothing is billed', () => {
    expect(feeStatus(0, 0, 0)).toBe('NO_FEES')
    expect(feeStatus(0, 500, 0)).toBe('NO_FEES')
  })

  it('is PAID once completed payments cover the bill', () => {
    expect(feeStatus(22000, 22000, 0)).toBe('PAID')
    expect(feeStatus(22000, 25000, 0)).toBe('PAID')
  })

  it('is PARTIAL with some money paid or pending', () => {
    expect(feeStatus(22000, 5000, 0)).toBe('PARTIAL')
    expect(feeStatus(22000, 0, 11000)).toBe('PARTIAL')
  })

  it('does not count pending payments as paid', () => {
    expect(feeStatus(22000, 0, 22000)).toBe('PARTIAL')
  })

  it('is UNPAID with nothing received', () => {
    expect(feeStatus(22000, 0, 0)).toBe('UNPAID')
  })
})

describe('gradeForScore', () => {
  const bands = [
    { grade: 'A', minScore: 80, maxScore: 100 },
    { grade: 'B', minScore: 70, maxScore: 79 },
    { grade: 'C', minScore: 60, maxScore: 69 },
    { grade: 'D', minScore: 50, maxScore: 59 },
    { grade: 'E', minScore: 0, maxScore: 49 }
  ]

  it.each([[100, 'A'], [80, 'A'], [79, 'B'], [70, 'B'], [65, 'C'], [50, 'D'], [49, 'E'], [0, 'E']])('%d → %s', (score, grade) => {
    expect(gradeForScore(score, bands)).toBe(grade)
  })

  it('rounds decimals before banding', () => {
    expect(gradeForScore(79.5, bands)).toBe('A')
    expect(gradeForScore(79.4, bands)).toBe('B')
  })

  it('works whatever order the bands are stored in', () => {
    expect(gradeForScore(72, [...bands].reverse())).toBe('B')
  })

  it('returns null without bands', () => {
    expect(gradeForScore(90, [])).toBeNull()
  })
})
