import { z } from 'zod'
import { requireManage } from '../../../utils/rbac'
import { parseBody } from '../../../utils/validate'
import { logAudit } from '../../../utils/audit'
import { linkConversation } from '../../../services/bot.service'

// Link a chat from an unrecognised WhatsApp account to a parent. This gives that
// account access to the children's results and fees, so it's admin-only, like
// other parent record changes.
const schema = z.object({ parentId: z.string().trim().min(1, 'Choose a parent') })

export default defineEventHandler(async (event) => {
  const user = await requireManage(event, 'students')
  const id = getRouterParam(event, 'id')!
  const { parentId } = await parseBody(event, schema)

  const { welcome } = await linkConversation(id, parentId)
  await logAudit({ userId: user.id, action: 'conversation.linked', entity: 'Conversation', entityId: id, metadata: { parentId } })

  return { linked: true, welcomeSent: welcome.ok, welcomeError: welcome.ok ? null : (welcome.error ?? 'Not delivered') }
})
