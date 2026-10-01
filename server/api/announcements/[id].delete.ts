import { requireManage } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'
import { logAudit } from '../../utils/audit'

// Drafts can be deleted; published announcements are archived instead.
export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'announcements')
  const id = getRouterParam(event, 'id')!

  const existing = await prisma.announcement.findUnique({ where: { id }, select: { status: true, title: true } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Announcement not found.' })
  if (existing.status !== 'DRAFT') throw createError({ statusCode: 409, statusMessage: 'Sent announcements can only be archived.' })

  await prisma.announcement.delete({ where: { id } })
  await logAudit({ userId: user.id, action: 'announcement.deleted', entity: 'Announcement', entityId: id, metadata: { title: existing.title } })
  return { ok: true }
})
