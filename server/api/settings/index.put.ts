import { requireSection } from '../../utils/rbac'
import { schoolSettingsSchema } from '../../validators/schoolSettings'
import { updateSchoolSettings } from '../../services/schoolSettings.service'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requireSection(event, 'settings')

  const body = await readBody(event)
  const parsed = schoolSettingsSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid school settings.'
    })
  }

  const settings = await updateSchoolSettings(parsed.data)

  await logAudit({
    userId: user.id,
    action: 'school_settings.updated',
    entity: 'SchoolSettings',
    entityId: settings.id
  })

  return settings
})
