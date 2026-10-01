import { requireManage } from '../../../utils/rbac'
import { prisma } from '../../../utils/prisma'
import { parseBody } from '../../../utils/validate'
import { replySchema } from '../../../validators/forms'
import { isWhatsAppLive, withinServiceWindow } from '../../../utils/whatsapp'
import { sendAndRecord } from '../../../services/bot.service'

// Staff reply from the inbox, sent to the parent on WhatsApp.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'conversations')
  const id = getRouterParam(event, 'id')!
  const { content } = await parseBody(event, replySchema)

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      parent: { select: { whatsappNumber: true } },
      messages: { where: { direction: 'INBOUND' }, orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } }
    }
  })
  if (!conversation) throw createError({ statusCode: 404, statusMessage: 'Conversation not found.' })
  if (conversation.status === 'CLOSED') throw createError({ statusCode: 409, statusMessage: 'Reopen this conversation before replying.' })

  // WhatsApp only allows free-form replies within 24 hours of the parent's last message.
  if (isWhatsAppLive() && !withinServiceWindow(conversation.messages[0]?.createdAt)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'This parent last wrote more than 24 hours ago, so WhatsApp won\'t deliver a free-form reply. Send an announcement to them instead, or wait for them to message again.'
    })
  }

  const { result, message } = await sendAndRecord({ conversationId: id, to: conversation.parent.whatsappNumber, content, staffId: user.id })

  await prisma.conversation.update({
    where: { id },
    data: {
      status: conversation.status === 'OPEN' || conversation.status === 'RESOLVED' ? 'IN_PROGRESS' : conversation.status,
      assignedToId: conversation.assignedToId ?? user.id
    }
  })

  if (!result.ok) {
    throw createError({ statusCode: 502, statusMessage: `WhatsApp didn't accept the message: ${result.error ?? 'unknown error'}` })
  }

  return {
    id: message.id,
    direction: message.direction,
    content: message.content,
    createdAt: message.createdAt,
    deliveryStatus: message.deliveryStatus,
    staff: user.name
  }
})
