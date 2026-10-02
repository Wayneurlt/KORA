import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { isWhatsAppLive, withinServiceWindow } from '../../utils/whatsapp'

export default defineEventHandler(async (event) => {
  await requireSection(event, 'conversations')
  const id = getRouterParam(event, 'id')!

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { name: true } },
      parent: {
        include: { children: { include: { student: { select: { id: true, firstName: true, lastName: true, className: true, stream: true } } } } }
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { staff: { select: { name: true } } }
      }
    }
  })
  if (!conversation) throw createError({ statusCode: 404, statusMessage: 'Conversation not found.' })

  const lastInboundAt = [...conversation.messages].reverse().find(message => message.direction === 'INBOUND')?.createdAt ?? null
  const live = isWhatsAppLive()

  return {
    id: conversation.id,
    category: conversation.category,
    status: conversation.status,
    assignedTo: conversation.assignedTo?.name ?? null,
    assignedToId: conversation.assignedToId,
    createdAt: conversation.createdAt,
    lastInboundAt,
    whatsappLive: live,
    // WhatsApp only delivers free-form replies within 24h of the parent's last message.
    canReply: conversation.status !== 'CLOSED' && (!live || withinServiceWindow(lastInboundAt)),
    parent: {
      id: conversation.parent.id,
      name: `${conversation.parent.firstName} ${conversation.parent.lastName}`,
      whatsappNumber: conversation.parent.whatsappNumber,
      email: conversation.parent.email,
      verificationStatus: conversation.parent.verificationStatus,
      children: conversation.parent.children.map(link => ({
        id: link.student.id,
        name: `${link.student.firstName} ${link.student.lastName}`,
        className: link.student.className,
        stream: link.student.stream
      }))
    },
    messages: conversation.messages.map(message => ({
      id: message.id,
      direction: message.direction,
      content: message.content,
      createdAt: message.createdAt,
      deliveryStatus: message.deliveryStatus,
      staff: message.staff?.name ?? null
    }))
  }
})
