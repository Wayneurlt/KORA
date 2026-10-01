import type { Announcement, Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { getWhatsAppConfig, sendWhatsAppTemplate, sendWhatsAppText } from '../utils/whatsapp'

type Target = Pick<Announcement, 'targetType' | 'targetClass' | 'targetStudentId'>

/** Active parents an announcement goes to. */
export function audienceWhere(target: Target): Prisma.ParentWhereInput {
  if (target.targetType === 'CLASS') {
    return { status: 'ACTIVE', children: { some: { student: { className: target.targetClass ?? '', status: 'ACTIVE' } } } }
  }
  if (target.targetType === 'STUDENT') {
    return { status: 'ACTIVE', children: { some: { studentId: target.targetStudentId ?? '' } } }
  }
  return { status: 'ACTIVE' }
}

/**
 * Sends an announcement over WhatsApp to every parent in its audience.
 *
 * Business-initiated messages outside the 24-hour window must use an approved
 * template, so when WHATSAPP_ANNOUNCEMENT_TEMPLATE is set the title and message
 * are passed as its two body parameters. Without it a plain text message is sent
 * (fine in test mode; in production only parents who wrote in the last 24h get it).
 *
 * With `onlyFailed`, retries the deliveries that failed last time.
 */
export async function deliverAnnouncement(announcement: Announcement, options: { onlyFailed?: boolean } = {}) {
  const parents = options.onlyFailed
    ? (await prisma.announcementDelivery.findMany({
        where: { announcementId: announcement.id, status: 'FAILED' },
        include: { parent: { select: { id: true, whatsappNumber: true } } }
      })).map(delivery => delivery.parent)
    : await prisma.parent.findMany({ where: audienceWhere(announcement), select: { id: true, whatsappNumber: true } })

  const { announcementTemplate } = getWhatsAppConfig()
  const text = `📢 *${announcement.title}*\n\n${announcement.message}`

  let sent = 0
  let failed = 0
  const queue = [...parents]

  // A few sends at a time keeps us well under WhatsApp's rate limits.
  async function worker() {
    for (let parent = queue.shift(); parent; parent = queue.shift()) {
      const result = announcementTemplate
        ? await sendWhatsAppTemplate(parent.whatsappNumber, announcementTemplate, [announcement.title, announcement.message])
        : await sendWhatsAppText(parent.whatsappNumber, text)

      const data = {
        providerMessageId: result.providerMessageId,
        status: result.ok ? 'SENT' as const : 'FAILED' as const,
        error: result.ok ? null : (result.error ?? 'Send failed')
      }
      await prisma.announcementDelivery.upsert({
        where: { announcementId_parentId: { announcementId: announcement.id, parentId: parent.id } },
        update: data,
        create: { announcementId: announcement.id, parentId: parent.id, ...data }
      })
      if (result.ok) sent++
      else failed++
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, queue.length || 1) }, worker))

  return { audience: parents.length, sent, failed }
}

/** Delivery counts per announcement, keyed by announcement id. */
export async function deliveryStats(announcementIds: string[]) {
  const rows = await prisma.announcementDelivery.groupBy({
    by: ['announcementId', 'status'],
    where: { announcementId: { in: announcementIds } },
    _count: { _all: true }
  })
  const stats = new Map<string, { total: number, sent: number, delivered: number, read: number, failed: number }>()
  for (const row of rows) {
    const entry = stats.get(row.announcementId) ?? { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 }
    const count = row._count._all
    entry.total += count
    if (row.status === 'FAILED') entry.failed += count
    else if (row.status === 'READ') {
      entry.read += count
      entry.delivered += count
      entry.sent += count
    } else if (row.status === 'DELIVERED') {
      entry.delivered += count
      entry.sent += count
    } else if (row.status === 'SENT') entry.sent += count
    stats.set(row.announcementId, entry)
  }
  return stats
}
