import { requireManage } from '../../../utils/rbac'
import { prisma } from '../../../utils/prisma'
import { logAudit } from '../../../utils/audit'
import { deliverAnnouncement } from '../../../services/announcement.service'

// Retries the deliveries that failed when the announcement was published.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'announcements')
  const id = getRouterParam(event, 'id')!

  const announcement = await prisma.announcement.findUnique({ where: { id } })
  if (!announcement) throw createError({ statusCode: 404, statusMessage: 'Announcement not found.' })
  if (announcement.status !== 'PUBLISHED') throw createError({ statusCode: 409, statusMessage: 'Only published announcements can be resent.' })

  const result = await deliverAnnouncement(announcement, { onlyFailed: true })
  await logAudit({ userId: user.id, action: 'announcement.resent', entity: 'Announcement', entityId: id, metadata: result })
  return result
})
