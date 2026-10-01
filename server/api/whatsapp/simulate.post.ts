import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { requireSection } from '../../utils/rbac'
import { parseBody } from '../../utils/validate'
import { prisma } from '../../utils/prisma'
import { isWhatsAppLive } from '../../utils/whatsapp'
import { handleInbound } from '../../services/bot.service'
import { normalizePhone } from '../../../shared/phone'

// Lets an admin pretend to be a parent and see how the bot replies, without a phone.
// Disabled in production once WhatsApp is live, so it can't send real messages by accident.

const schema = z.object({
  from: z.string().trim().min(1, 'Choose a parent number'),
  text: z.string().trim().min(1, 'Type a message').max(1000)
})

export default defineEventHandler(async (event) => {
  await requireSection(event, 'settings')
  if (isWhatsAppLive() && process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 403, statusMessage: 'The simulator is off while WhatsApp is live in production.' })
  }

  const input = await parseBody(event, schema)
  const from = normalizePhone(input.from)
  if (!from) throw createError({ statusCode: 400, statusMessage: 'That doesn\'t look like a valid phone number.' })

  const startedAt = new Date()
  await handleInbound({ from, providerMessageId: `simin_${randomUUID()}`, text: input.text, type: 'text' })

  const parent = await prisma.parent.findUnique({ where: { whatsappNumber: from }, select: { id: true, verificationStatus: true } })
  const replies = parent
    ? await prisma.message.findMany({
        where: { direction: 'OUTBOUND', conversation: { parentId: parent.id }, createdAt: { gte: startedAt } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, content: true, createdAt: true }
      })
    : []

  return {
    registered: !!parent,
    verificationStatus: parent?.verificationStatus ?? null,
    replies
  }
})
