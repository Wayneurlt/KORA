import type { ConversationCategory, DeliveryStatus } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { sendWhatsAppText, type SendResult, type WhatsAppRecipient } from '../utils/whatsapp'
import { normalizePhone } from '../../shared/phone'
import { getSchoolSettings } from './schoolSettings.service'
import { getFeeBalances } from './fees.service'
import { menuText, money, parseIntent, sameAdmissionNumber, type Intent } from './bot.intents'

// Handles messages arriving on the school's WhatsApp number.
//
// Every message is stored in a Conversation. The bot answers self-service
// requests (results, balance, notices) and leaves those conversations RESOLVED
// so they stay out of the staff inbox. "Talk to the school" (or a staff reply)
// opens the conversation; while it's OPEN / IN_PROGRESS the bot stays quiet.
//
// Parents are recognised by their WhatsApp account (SendPulse contact id) or
// their number. WhatsApp hides the number of people who use a username, so a
// sender we can't match lands in the inbox as an unlinked chat for staff to link.

export interface InboundMessage {
  /** Phone number — null when WhatsApp hides it */
  from: string | null
  /** SendPulse contact id of the sender */
  contactId?: string | null
  providerMessageId: string
  text: string | null
  type: string
  timestamp?: Date
  profileName?: string
}

const INTENT_CATEGORY: Partial<Record<Intent, ConversationCategory>> = {
  RESULTS: 'ACADEMIC',
  BALANCE: 'FINANCE',
  AGENT: 'TALK_TO_SCHOOL'
}

/** Send a text and store it as an outbound message on the conversation. */
export async function sendAndRecord(input: { conversationId: string, to: WhatsAppRecipient, content: string, staffId?: string | null }) {
  const result = await sendWhatsAppText(input.to, input.content)
  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      staffId: input.staffId ?? null,
      direction: 'OUTBOUND',
      content: input.content,
      providerMessageId: result.providerMessageId,
      deliveryStatus: result.ok ? 'SENT' : 'FAILED'
    }
  })
  return { result, message }
}

export async function handleInbound(inbound: InboundMessage) {
  // WhatsApp retries webhooks — ignore messages we've already stored.
  const duplicate = await prisma.message.findFirst({ where: { providerMessageId: inbound.providerMessageId }, select: { id: true } })
  if (duplicate) return

  const phone = inbound.from ? normalizePhone(inbound.from) ?? inbound.from : null
  const [school, parent] = await Promise.all([getSchoolSettings(), findParent(inbound.contactId ?? null, phone)])

  if (!parent || parent.status !== 'ACTIVE') {
    await handleUnlinked(inbound, phone, school)
    return
  }

  const text = (inbound.text ?? '').trim()
  const content = text || `[${inbound.type} message]`

  // Continue the active conversation, or the bot session from the last 24 hours, or start a new one.
  const conversation = await prisma.conversation.findFirst({
    where: {
      parentId: parent.id,
      OR: [
        { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, status: 'RESOLVED' }
      ]
    },
    orderBy: { updatedAt: 'desc' }
  }) ?? await prisma.conversation.create({
    data: { parentId: parent.id, category: 'GENERAL', status: 'RESOLVED' }
  })

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      parentId: parent.id,
      direction: 'INBOUND',
      messageType: 'TEXT',
      content,
      providerMessageId: inbound.providerMessageId,
      deliveryStatus: 'RECEIVED',
      createdAt: inbound.timestamp ?? new Date()
    }
  })
  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })

  const to = { contactId: inbound.contactId ?? parent.whatsappContactId, phone: phone ?? parent.whatsappNumber }
  const reply = (body: string) => sendAndRecord({ conversationId: conversation.id, to, content: body })

  // A person is handling this conversation — the bot stays out of it.
  if (conversation.status === 'OPEN' || conversation.status === 'IN_PROGRESS') return

  // Verification: the parent proves they're linked to a child by sending an admission number.
  if (parent.verificationStatus !== 'VERIFIED') {
    const child = parent.children.find(link => sameAdmissionNumber(link.student.admissionNumber, text))
    if (child) {
      await prisma.parent.update({ where: { id: parent.id }, data: { verificationStatus: 'VERIFIED', verificationCode: null } })
      await reply(`Thank you, ${parent.firstName} — you're verified ✅\n\n${menuText(school.name)}`)
    } else {
      if (parent.verificationStatus === 'UNVERIFIED') {
        await prisma.parent.update({ where: { id: parent.id }, data: { verificationStatus: 'PENDING' } })
      }
      await reply([
        `Hi ${parent.firstName} 👋 Welcome to *${school.name}*.`,
        'To keep your children\'s information private, please reply with the *admission number* of one of your children (for example KOR-1001).'
      ].join('\n\n'))
    }
    return
  }

  if (!text) {
    await reply(`I can only read text messages for now.\n\n${menuText(school.name, parent.firstName)}`)
    return
  }

  const intent = parseIntent(text)
  const category = INTENT_CATEGORY[intent]
  if (category && conversation.category !== category) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { category } })
  }

  const children = parent.children.map(link => link.student).filter(student => student.status === 'ACTIVE')

  switch (intent) {
    case 'RESULTS':
      await reply(await resultsReply(children))
      break
    case 'BALANCE':
      await reply(await balanceReply(children, school.currency))
      break
    case 'NEWS':
      await reply(await newsReply(children))
      break
    case 'CHILDREN':
      await reply(children.length
        ? `Your children at ${school.name}:\n\n${children.map(child => `• ${child.firstName} ${child.lastName} — ${child.className}${child.stream ? ` ${child.stream}` : ''} (${child.admissionNumber})`).join('\n')}`
        : 'No children are linked to your number yet. Please contact the school office.')
      break
    case 'AGENT':
      await prisma.conversation.update({ where: { id: conversation.id }, data: { status: 'OPEN', category: 'TALK_TO_SCHOOL' } })
      await reply('Okay 👍 A member of staff will reply here as soon as possible. Please type your question.')
      break
    case 'MENU':
      await reply(menuText(school.name, parent.firstName))
      break
    default:
      await reply(`Sorry, I didn't understand that.\n\n${menuText(school.name)}\n\nOr reply *5* to talk to a member of staff.`)
  }
}

// Recognising senders ----------------------------------------------------

const withChildren = { children: { include: { student: true } } } as const

async function findParent(contactId: string | null, phone: string | null) {
  if (contactId) {
    const parent = await prisma.parent.findUnique({ where: { whatsappContactId: contactId }, include: withChildren })
    if (parent) return parent
  }
  if (!phone) return null

  const parent = await prisma.parent.findUnique({ where: { whatsappNumber: phone }, include: withChildren })
  // Remember their WhatsApp account, so they're still recognised if they later hide their number.
  if (parent && contactId && !parent.whatsappContactId) {
    try {
      await prisma.parent.update({ where: { id: parent.id }, data: { whatsappContactId: contactId } })
      parent.whatsappContactId = contactId
    } catch (error) {
      console.error('[whatsapp] could not save contact id for parent', parent.id, error)
    }
  }
  return parent
}

/**
 * A sender we can't match to a parent: keep their messages in one inbox thread
 * (no parent yet) so staff can see them and link the chat to the right parent.
 */
async function handleUnlinked(inbound: InboundMessage, phone: string | null, school: { name: string, phone: string | null }) {
  const contactId = inbound.contactId ?? null
  const existing = await prisma.conversation.findFirst({
    where: { parentId: null, OR: [...(contactId ? [{ contactId }] : []), ...(phone ? [{ contactPhone: phone }] : [])] },
    orderBy: { updatedAt: 'desc' }
  })

  const details = { contactId, contactName: inbound.profileName ?? existing?.contactName ?? null, contactPhone: phone ?? existing?.contactPhone ?? null }
  const conversation = existing
    ? await prisma.conversation.update({
        where: { id: existing.id },
        // A chat staff closed stays closed; anything else comes back to the inbox.
        data: { ...details, status: existing.status === 'RESOLVED' ? 'OPEN' : existing.status }
      })
    : await prisma.conversation.create({ data: { ...details, category: 'GENERAL', status: 'OPEN' } })

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'INBOUND',
      messageType: 'TEXT',
      content: (inbound.text ?? '').trim() || `[${inbound.type} message]`,
      providerMessageId: inbound.providerMessageId,
      deliveryStatus: 'RECEIVED',
      createdAt: inbound.timestamp ?? new Date()
    }
  })

  // Explain once, when the chat starts — not on every message.
  if (!existing) {
    await sendAndRecord({
      conversationId: conversation.id,
      to: { contactId, phone },
      content: [
        `Hello 👋 Thanks for messaging *${school.name}*.`,
        'We couldn\'t match this WhatsApp account to a parent in our records yet. A member of staff will link it and reply here shortly.',
        ...(school.phone ? [`You can also call the school office on ${school.phone}.`] : [])
      ].join('\n\n')
    })
  }
}

/**
 * Staff link an unrecognised chat to a parent. The WhatsApp account is saved on
 * the parent (so the bot recognises them from now on), the parent counts as
 * verified, and the bot sends them the menu.
 */
export async function linkConversation(conversationId: string, parentId: string): Promise<{ welcome: SendResult }> {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation) throw createError({ statusCode: 404, statusMessage: 'Conversation not found.' })
  if (conversation.parentId) throw createError({ statusCode: 409, statusMessage: 'This chat is already linked to a parent.' })

  const parent = await prisma.parent.findUnique({ where: { id: parentId } })
  if (!parent || parent.status !== 'ACTIVE') throw createError({ statusCode: 400, statusMessage: 'Choose an active parent.' })

  const { contactId } = conversation
  await prisma.$transaction([
    // One WhatsApp account belongs to one parent — take it off anyone else.
    ...(contactId ? [prisma.parent.updateMany({ where: { whatsappContactId: contactId, id: { not: parent.id } }, data: { whatsappContactId: null } })] : []),
    prisma.parent.update({
      where: { id: parent.id },
      data: { ...(contactId && { whatsappContactId: contactId }), verificationStatus: 'VERIFIED', verificationCode: null }
    }),
    // Resolved hands the chat back to the bot.
    prisma.conversation.update({ where: { id: conversation.id }, data: { parentId: parent.id, status: 'RESOLVED' } }),
    prisma.message.updateMany({ where: { conversationId: conversation.id, direction: 'INBOUND' }, data: { parentId: parent.id } })
  ])

  const school = await getSchoolSettings()
  const { result } = await sendAndRecord({
    conversationId: conversation.id,
    to: { contactId, phone: conversation.contactPhone ?? parent.whatsappNumber },
    content: `Thank you, ${parent.firstName} — your WhatsApp is now linked to *${school.name}* ✅\n\n${menuText(school.name)}`
  })
  return { welcome: result }
}

type Child = { id: string, firstName: string, lastName: string, className: string }

async function resultsReply(children: Child[]) {
  if (!children.length) return 'No children are linked to your number yet.'
  const results = await prisma.result.findMany({
    where: { studentId: { in: children.map(child => child.id) }, exam: { status: 'PUBLISHED' } },
    include: { exam: true, subject: { select: { name: true } } },
    orderBy: [{ exam: { createdAt: 'desc' } }, { subject: { name: 'asc' } }]
  })
  const blocks = children.map((child) => {
    const own = results.filter(result => result.studentId === child.id)
    const latestExamId = own[0]?.examId
    const latest = own.filter(result => result.examId === latestExamId)
    if (!latest.length) return `📘 *${child.firstName} ${child.lastName}*\nNo published results yet.`
    const average = Math.round((latest.reduce((sum, result) => sum + result.score, 0) / latest.length) * 10) / 10
    return [
      `📘 *${child.firstName} ${child.lastName}* — ${latest[0]!.exam.name}`,
      ...latest.map(result => `${result.subject.name}: ${result.score}${result.grade ? ` (${result.grade})` : ''}`),
      `*Average: ${average}%*`
    ].join('\n')
  })
  return blocks.join('\n\n')
}

async function balanceReply(children: Child[], currency: string) {
  if (!children.length) return 'No children are linked to your number yet.'
  const balances = await getFeeBalances(children.map(child => child.id))
  const lines = children.map((child) => {
    const fee = balances.get(child.id)
    if (!fee || fee.status === 'NO_FEES') return `💰 *${child.firstName}* (${child.className}): no fees billed yet.`
    const status = fee.balance <= 0 ? 'Fully paid ✅' : `Balance: *${money(fee.balance, currency)}*`
    const pending = fee.pending ? `\n   Awaiting confirmation: ${money(fee.pending, currency)}` : ''
    return `💰 *${child.firstName}* (${child.className})\n   Billed: ${money(fee.billed, currency)} · Paid: ${money(fee.paid, currency)}\n   ${status}${pending}`
  })
  return lines.join('\n\n')
}

async function newsReply(children: Child[]) {
  const announcements = await prisma.announcement.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { targetType: 'ALL' },
        { targetType: 'CLASS', targetClass: { in: [...new Set(children.map(child => child.className))] } },
        { targetType: 'STUDENT', targetStudentId: { in: children.map(child => child.id) } }
      ]
    },
    orderBy: { publishedAt: 'desc' },
    take: 3
  })
  if (!announcements.length) return 'There are no announcements right now.'
  return `📢 Latest announcements:\n\n${announcements.map(item => `*${item.title}*\n${item.message}`).join('\n\n')}`
}

// Delivery status callbacks ----------------------------------------------

const STATUS_RANK: Record<DeliveryStatus, number> = { RECEIVED: 0, QUEUED: 1, SENDING: 1, SENT: 2, DELIVERED: 3, READ: 4, FAILED: 5 }
const STATUS_MAP: Record<string, DeliveryStatus> = { sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED' }

export async function handleStatus(update: { id: string, status: string, error?: string }) {
  const next = STATUS_MAP[update.status]
  if (!next) return

  const message = await prisma.message.findFirst({ where: { providerMessageId: update.id }, select: { id: true, deliveryStatus: true } })
  if (message && (next === 'FAILED' || STATUS_RANK[next] > STATUS_RANK[message.deliveryStatus])) {
    await prisma.message.update({ where: { id: message.id }, data: { deliveryStatus: next } })
    return
  }

  const delivery = await prisma.announcementDelivery.findUnique({ where: { providerMessageId: update.id }, select: { id: true, status: true } })
  if (delivery && (next === 'FAILED' || STATUS_RANK[next] > STATUS_RANK[delivery.status])) {
    await prisma.announcementDelivery.update({ where: { id: delivery.id }, data: { status: next, error: update.error ?? null } })
  }
}
