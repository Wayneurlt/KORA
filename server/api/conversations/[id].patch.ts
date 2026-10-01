import { canAccessSection } from '../../../shared/access'
import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { parseBody } from '../../utils/validate'
import { logAudit } from '../../utils/audit'
import { conversationUpdateSchema } from '../../validators/forms'

// Change status (open / in progress / resolved / closed) or the assigned staff member.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'conversations')
  const id = getRouterParam(event, 'id')!
  const input = await parseBody(event, conversationUpdateSchema)

  const conversation = await prisma.conversation.findUnique({ where: { id }, select: { id: true, status: true, assignedToId: true } })
  if (!conversation) throw createError({ statusCode: 404, statusMessage: 'Conversation not found.' })

  if (input.assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: input.assignedToId }, select: { role: true, status: true } })
    if (!assignee || assignee.status !== 'ACTIVE' || !canAccessSection(assignee.role, 'conversations')) {
      throw createError({ statusCode: 400, statusMessage: 'That staff member can\'t be assigned conversations.' })
    }
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      ...(input.status && { status: input.status }),
      ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId })
    },
    include: { assignedTo: { select: { name: true } } }
  })

  await logAudit({ userId: user.id, action: 'conversation.updated', entity: 'Conversation', entityId: id, metadata: { from: conversation.status, ...input } })
  return { id: updated.id, status: updated.status, assignedToId: updated.assignedToId, assignedTo: updated.assignedTo?.name ?? null }
})
