import type { Prisma } from '@prisma/client'
import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { contains, conversationListQuery, searchWhere } from '../../validators/lists'

export default defineEventHandler(async (event) => {
  await requireSection(event, 'conversations')
  const query = await getValidatedQuery(event, conversationListQuery.parse)

  const where: Prisma.ConversationWhereInput = {
    ...(query.status === 'ACTIVE'
      ? { status: { in: ['OPEN', 'IN_PROGRESS'] } }
      : query.status !== 'ALL' ? { status: query.status } : {}),
    ...(query.category !== 'ALL' && { category: query.category }),
    ...searchWhere(query.search, term => [
      { parent: { OR: [{ firstName: contains(term) }, { lastName: contains(term) }, { whatsappNumber: contains(term) }] } },
      { messages: { some: { content: contains(term) } } }
    ])
  }

  const [conversations, statusCounts] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        parent: { select: { id: true, firstName: true, lastName: true, whatsappNumber: true } },
        assignedTo: { select: { name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, direction: true, createdAt: true } },
        _count: { select: { messages: true } }
      }
    }),
    prisma.conversation.groupBy({ by: ['status'], _count: { _all: true } })
  ])

  const counts = Object.fromEntries(statusCounts.map(row => [row.status, row._count._all])) as Partial<Record<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED', number>>

  return {
    counts: { ...counts, ACTIVE: (counts.OPEN ?? 0) + (counts.IN_PROGRESS ?? 0) },
    items: conversations
      .map((conversation) => {
        const last = conversation.messages[0] ?? null
        return {
          id: conversation.id,
          category: conversation.category,
          status: conversation.status,
          assignedTo: conversation.assignedTo?.name ?? null,
          parent: {
            id: conversation.parent.id,
            name: `${conversation.parent.firstName} ${conversation.parent.lastName}`,
            whatsappNumber: conversation.parent.whatsappNumber
          },
          lastMessage: last,
          messageCount: conversation._count.messages,
          // The parent spoke last and nobody has replied yet.
          awaitingReply: last?.direction === 'INBOUND' && ['OPEN', 'IN_PROGRESS'].includes(conversation.status),
          updatedAt: last?.createdAt ?? conversation.createdAt
        }
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }
})
