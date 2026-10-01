import { canAccessSection } from '../../../shared/access'
import { prisma } from '../../utils/prisma'

// Small counts for the sidebar's nav pills. Each count is only returned to
// roles that can open the matching section.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const openConversations = canAccessSection(user.role, 'conversations')
    ? await prisma.conversation.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } })
    : null

  return { openConversations }
})
