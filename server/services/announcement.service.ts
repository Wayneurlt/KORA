import type { Announcement, Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { getWhatsAppConfig, sendWhatsAppTemplate, sendWhatsAppText } from '../utils/whatsapp'

// Announcement delivery is done in small batches so it fits inside serverless
// time limits (Vercel): publishing queues one AnnouncementDelivery row per parent,
// then each batch claims a few rows (QUEUED → SENDING), sends them and records
// SENT / FAILED. The dashboard keeps calling the batch endpoint until nothing
// is left. Rows stuck in SENDING (a request that timed out) are reclaimed.

const BATCH_SIZE = 25
const CONCURRENCY = 4 // SendPulse allows ~10 requests/second
const STALE_SENDING_MS = 2 * 60 * 1000
const TIME_BUDGET_MS = 20_000

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

/** Creates a QUEUED delivery for every parent in the audience. Returns the audience size. */
export async function queueAnnouncement(announcement: Announcement) {
  const parents = await prisma.parent.findMany({ where: audienceWhere(announcement), select: { id: true } })
  if (parents.length) {
    await prisma.announcementDelivery.createMany({
      data: parents.map(parent => ({ announcementId: announcement.id, parentId: parent.id, status: 'QUEUED' as const })),
      skipDuplicates: true
    })
  }
  return parents.length
}

/** Puts failed deliveries back in the queue. Returns how many. */
export async function requeueFailed(announcementId: string) {
  const { count } = await prisma.announcementDelivery.updateMany({
    where: { announcementId, status: 'FAILED' },
    data: { status: 'QUEUED', error: null }
  })
  return count
}

function claimableWhere(announcementId: string): Prisma.AnnouncementDeliveryWhereInput {
  return {
    announcementId,
    OR: [
      { status: 'QUEUED' },
      { status: 'SENDING', updatedAt: { lt: new Date(Date.now() - STALE_SENDING_MS) } }
    ]
  }
}

/**
 * Sends the next batch of queued deliveries.
 *
 * Business-initiated messages outside the 24-hour window must use an approved
 * template, so when WHATSAPP_ANNOUNCEMENT_TEMPLATE is set the title and message
 * are passed as its two body parameters. Without it a plain text message is sent
 * (fine in test mode; live, only parents who wrote in the last 24h receive it).
 */
export async function processDeliveryBatch(announcement: Announcement) {
  const startedAt = Date.now()
  const { announcementTemplate } = getWhatsAppConfig()
  const text = `📢 *${announcement.title}*\n\n${announcement.message}`
  let sent = 0
  let failed = 0

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const candidates = await prisma.announcementDelivery.findMany({
      where: claimableWhere(announcement.id),
      select: { id: true },
      take: BATCH_SIZE
    })
    if (!candidates.length) break

    // Claim each row atomically (QUEUED/stale → SENDING); only rows this request
    // actually changed are sent, so two browser tabs can't send the same message.
    const results = await Promise.all(candidates.map(candidate => prisma.announcementDelivery.updateMany({
      where: { id: candidate.id, ...claimableWhere(announcement.id) },
      data: { status: 'SENDING' }
    })))
    const ids = candidates.filter((_, index) => results[index]!.count === 1).map(candidate => candidate.id)
    const claimed = await prisma.announcementDelivery.findMany({
      where: { id: { in: ids } },
      include: { parent: { select: { whatsappNumber: true, whatsappContactId: true } } }
    })

    const queue = [...claimed]
    async function worker() {
      for (let delivery = queue.shift(); delivery; delivery = queue.shift()) {
        const to = { contactId: delivery.parent.whatsappContactId, phone: delivery.parent.whatsappNumber }
        const result = announcementTemplate
          ? await sendWhatsAppTemplate(to, announcementTemplate, [announcement.title, announcement.message])
          : await sendWhatsAppText(to, text)
        await prisma.announcementDelivery.update({
          where: { id: delivery.id },
          data: {
            providerMessageId: result.providerMessageId,
            status: result.ok ? 'SENT' : 'FAILED',
            error: result.ok ? null : (result.error ?? 'Send failed')
          }
        })
        if (result.ok) sent++
        else failed++
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, worker))

    if (claimed.length < candidates.length) break // another request is working on the rest
  }

  const remaining = await prisma.announcementDelivery.count({
    where: { announcementId: announcement.id, status: { in: ['QUEUED', 'SENDING'] } }
  })
  return { sent, failed, remaining }
}

export interface DeliveryStats {
  total: number
  sent: number
  failed: number
  /** Still waiting to be sent (queued, or a batch is sending them) */
  pending: number
}

/** Delivery counts per announcement, keyed by announcement id. */
export async function deliveryStats(announcementIds: string[]) {
  const rows = await prisma.announcementDelivery.groupBy({
    by: ['announcementId', 'status'],
    where: { announcementId: { in: announcementIds } },
    _count: { _all: true }
  })
  const stats = new Map<string, DeliveryStats>()
  for (const row of rows) {
    const entry = stats.get(row.announcementId) ?? { total: 0, sent: 0, failed: 0, pending: 0 }
    const count = row._count._all
    entry.total += count
    if (row.status === 'FAILED') entry.failed += count
    else if (row.status === 'QUEUED' || row.status === 'SENDING') entry.pending += count
    else entry.sent += count // SENT / DELIVERED / READ
    stats.set(row.announcementId, entry)
  }
  return stats
}
