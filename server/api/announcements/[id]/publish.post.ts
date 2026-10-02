import { requireManage } from '../../../utils/rbac'
import { prisma } from '../../../utils/prisma'
import { logAudit } from '../../../utils/audit'
import { processDeliveryBatch, queueAnnouncement } from '../../../services/announcement.service'
import { isWhatsAppLive } from '../../../utils/whatsapp'

// Publishes a draft, queues it for every parent in the audience and sends the
// first batch. If `remaining` > 0 the dashboard continues via /deliver.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'announcements')
  const id = getRouterParam(event, 'id')!

  // Flip DRAFT → PUBLISHED atomically so a double click can't publish twice.
  const { count } = await prisma.announcement.updateMany({
    where: { id, status: 'DRAFT' },
    data: { status: 'PUBLISHED', publishedAt: new Date() }
  })
  if (!count) {
    const exists = await prisma.announcement.findUnique({ where: { id }, select: { id: true } })
    throw createError(exists
      ? { statusCode: 409, statusMessage: 'This announcement has already been published.' }
      : { statusCode: 404, statusMessage: 'Announcement not found.' })
  }

  const announcement = await prisma.announcement.findUniqueOrThrow({ where: { id } })
  const audience = await queueAnnouncement(announcement)
  const batch = await processDeliveryBatch(announcement)

  await logAudit({ userId: user.id, action: 'announcement.published', entity: 'Announcement', entityId: id, metadata: { audience } })
  return { audience, ...batch, simulated: !isWhatsAppLive() }
})
