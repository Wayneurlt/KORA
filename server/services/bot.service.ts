import type { ConversationCategory, DeliveryStatus } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { sendWhatsAppText } from '../utils/whatsapp'
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

export interface InboundMessage {
  from: string
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
export async function sendAndRecord(input: { conversationId: string, to: string, content: string, staffId?: string | null }) {
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

  const number = normalizePhone(inbound.from) ?? inbound.from
  const [school, parent] = await Promise.all([
    getSchoolSettings(),
    prisma.parent.findUnique({
      where: { whatsappNumber: number },
      include: { children: { include: { student: true } } }
    })
  ])

  if (!parent || parent.status !== 'ACTIVE') {
    await sendWhatsAppText(number, [
      `Hello 👋 This number isn't registered with *${school.name}* yet.`,
      school.phone ? `Please contact the school office on ${school.phone} to be added.` : 'Please contact the school office to be added.'
    ].join('\n'))
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

  const reply = (body: string) => sendAndRecord({ conversationId: conversation.id, to: number, content: body })

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

const STATUS_RANK: Record<DeliveryStatus, number> = { RECEIVED: 0, QUEUED: 1, SENT: 2, DELIVERED: 3, READ: 4, FAILED: 5 }
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
