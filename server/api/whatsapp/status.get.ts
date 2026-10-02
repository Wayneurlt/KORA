import { requireSection } from '../../utils/rbac'
import { getWhatsAppConfig, isWhatsAppLive } from '../../utils/whatsapp'

// SendPulse connection overview for the Settings page (admins only).
// The webhook URL includes the webhook secret so it can be pasted into SendPulse;
// the API client secret is never returned.
export default defineEventHandler(async (event) => {
  await requireSection(event, 'settings')
  const config = getWhatsAppConfig()
  const appUrl = (process.env.APP_URL || getRequestURL(event).origin).replace(/\/$/, '')
  const webhookBase = `${appUrl}/api/whatsapp/webhook`

  return {
    provider: 'SendPulse',
    live: isWhatsAppLive(config),
    clientIdSet: !!config.clientId,
    clientSecretSet: !!config.clientSecret,
    botId: config.botId ? `…${config.botId.slice(-6)}` : null,
    webhookSecretSet: !!config.webhookSecret,
    webhookUrl: config.webhookSecret ? `${webhookBase}?token=${encodeURIComponent(config.webhookSecret)}` : webhookBase,
    announcementTemplate: config.announcementTemplate || null,
    templateLanguage: config.templateLanguage,
    simulatorEnabled: !isWhatsAppLive(config) || process.env.NODE_ENV !== 'production'
  }
})
