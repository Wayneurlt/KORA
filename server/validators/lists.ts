import { z } from 'zod'

// Query-string schemas for the dashboard list endpoints.

const search = z.string().trim().max(100).optional()
const page = z.coerce.number().int().min(1).default(1)
const pageSize = z.coerce.number().int().min(5).max(100).default(20)

export const studentListQuery = z.object({
  search,
  className: z.string().trim().max(50).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'ALL']).default('ACTIVE'),
  page,
  pageSize
})

export const parentListQuery = z.object({
  search,
  verification: z.enum(['VERIFIED', 'PENDING', 'UNVERIFIED', 'ALL']).default('ALL'),
  page,
  pageSize
})

export const resultsQuery = z.object({
  examId: z.string().trim().max(50).optional(),
  className: z.string().trim().max(50).optional(),
  search
})

export const feeListQuery = z.object({
  search,
  className: z.string().trim().max(50).optional(),
  status: z.enum(['PAID', 'PARTIAL', 'UNPAID', 'ALL']).default('ALL'),
  page,
  pageSize
})

export const announcementListQuery = z.object({
  search,
  status: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED', 'ALL']).default('ALL')
})

export const conversationListQuery = z.object({
  search,
  status: z.enum(['ACTIVE', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ALL']).default('ACTIVE'),
  category: z.enum(['FINANCE', 'ACADEMIC', 'GENERAL', 'TALK_TO_SCHOOL', 'ALL']).default('ALL')
})

/**
 * Turns "brian gift" into an AND of per-word ORs, so every word has to match
 * one of the given fields (case-insensitive).
 */
export function searchWhere<T>(text: string | undefined, fields: (term: string) => T[]) {
  const terms = (text ?? '').split(/\s+/).filter(Boolean).slice(0, 5)
  if (!terms.length) return undefined
  return { AND: terms.map(term => ({ OR: fields(term) })) }
}

export const contains = (term: string) => ({ contains: term, mode: 'insensitive' as const })
