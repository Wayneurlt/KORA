import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

interface AuditLogInput {
  userId?: string | null
  action: string
  entity: string
  entityId?: string | null
  metadata?: Prisma.InputJsonObject
}

export async function logAudit(input: AuditLogInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata
    }
  })
}
