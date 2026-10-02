import { requireManage } from '../../../utils/rbac'
import { prisma } from '../../../utils/prisma'
import { logAudit } from '../../../utils/audit'
import { processDeliveryBatch, requeueFailed } from '../../../services/announcement.service'

// Queues the failed deliveries again and sends the first batch.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'announcements')
  const id = getRouterParam(event, 'id')!

  const announcement = await prisma.announcement.findUnique({ where: { id } })
  if (!announcement) throw createError({ statusCode: 404, statusMessage: 'Announcement not found.' })
  if (announcement.status !== 'PUBLISHED') throw createError({ statusCode: 409, statusMessage: 'Only published announcements can be resent.' })

  const retried = await requeueFailed(id)
  const batch = await processDeliveryBatch(announcement)

  await logAudit({ userId: user.id, action: 'announcement.resent', entity: 'Announcement', entityId: id, metadata: { retried } })
  return { retried, ...batch }
})
