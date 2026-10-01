import { requireSection } from '../../utils/rbac'
import { getSchoolSettings } from '../../services/schoolSettings.service'

export default defineEventHandler(async (event) => {
  await requireSection(event, 'settings')
  return getSchoolSettings()
})
