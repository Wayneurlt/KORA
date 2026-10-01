import type { H3Event } from 'h3'
import type { z } from 'zod'

/**
 * Reads and validates a JSON body, turning the first Zod issue into a
 * readable 400 message (the same style the settings and login routes use).
 */
export async function parseBody<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw createError({ statusCode: 400, statusMessage: issue?.message ?? 'Invalid request.' })
  }
  return parsed.data
}

/** Maps Prisma's unique-constraint error to a friendly 409. */
export function rethrowUnique(error: unknown, message: string): never {
  if ((error as { code?: string })?.code === 'P2002') {
    throw createError({ statusCode: 409, statusMessage: message })
  }
  throw error
}
