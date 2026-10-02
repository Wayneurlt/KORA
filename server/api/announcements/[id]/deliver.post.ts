import { requireManage } from '../../../utils/rbac'
import { prisma } from '../../../utils/prisma'
import { processDeliveryBatch } from '../../../services/announcement.service'

// Sends the next batch of a published announcement's queued deliveries.
// Called repeatedly by the dashboard until `remaining` is 0; also resumes a
// send that was interrupted (closed tab, timed-out request).
export default defineEventHandler(async (event) => {
  await requireManage(event, 'announcements')
  const id = getRouterParam(event, 'id')!

  const announcement = await prisma.announcement.findUnique({ where: { id } })
  if (!announcement) throw createError({ statusCode: 404, statusMessage: 'Announcement not found.' })
  if (announcement.status !== 'PUBLISHED') throw createError({ statusCode: 409, statusMessage: 'Only published announcements can be sent.' })

  return processDeliveryBatch(announcement)
})
