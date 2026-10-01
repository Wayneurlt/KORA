import { requireManage } from '../../../utils/rbac'
import { prisma } from '../../../utils/prisma'
import { logAudit } from '../../../utils/audit'

// Hides a published announcement from the bot's "latest announcements" reply.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'announcements')
  const id = getRouterParam(event, 'id')!

  const { count } = await prisma.announcement.updateMany({ where: { id, status: 'PUBLISHED' }, data: { status: 'ARCHIVED' } })
  if (!count) throw createError({ statusCode: 409, statusMessage: 'Only published announcements can be archived.' })

  await logAudit({ userId: user.id, action: 'announcement.archived', entity: 'Announcement', entityId: id })
  return { ok: true }
})
