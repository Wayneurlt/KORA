import { requireSection } from '../../utils/rbac'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requireSection(event, 'staff')

  const users = await prisma.user.findMany({
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mustChangePassword: true,
      createdAt: true,
      _count: { select: { assignedConversations: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } } } }
    }
  })

  return users.map(({ _count, ...user }) => ({ ...user, openConversations: _count.assignedConversations }))
})
