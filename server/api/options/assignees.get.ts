import { canAccessSection } from '../../../shared/access'
import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'

// Staff who can be assigned inbox conversations.
export default defineEventHandler(async (event) => {
  await requireSection(event, 'conversations')
  const users = await prisma.user.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true, role: true } })
  return users.filter(user => canAccessSection(user.role, 'conversations')).map(user => ({ id: user.id, name: user.name }))
})
