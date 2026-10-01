import { requireSection } from '../../utils/rbac'
import { getWhatsAppConfig, isWhatsAppLive } from '../../utils/whatsapp'

// Connection overview for the Settings page. Never returns secrets.
export default defineEventHandler(async (event) => {
  await requireSection(event, 'settings')
  const config = getWhatsAppConfig()
  const appUrl = (process.env.APP_URL || getRequestURL(event).origin).replace(/\/$/, '')

  return {
    live: isWhatsAppLive(config),
    phoneNumberId: config.phoneNumberId ? `…${config.phoneNumberId.slice(-4)}` : null,
    webhookUrl: `${appUrl}/api/whatsapp/webhook`,
    verifyTokenSet: !!config.verifyToken,
    appSecretSet: !!config.appSecret,
    announcementTemplate: config.announcementTemplate || null,
    templateLanguage: config.templateLanguage,
    simulatorEnabled: !isWhatsAppLive(config) || process.env.NODE_ENV !== 'production'
  }
})
