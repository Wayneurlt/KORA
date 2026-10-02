import { getWhatsAppConfig, verifyWebhookToken } from '../../utils/whatsapp'
import { handleInbound, handleStatus } from '../../services/bot.service'
import { parseSendPulseWebhook } from '../../services/sendpulse.webhook'

// SendPulse chatbot webhook: incoming WhatsApp messages and failed deliveries.
// Public route — SendPulse doesn't sign requests, so the URL carries a secret
// token (?token=SENDPULSE_WEBHOOK_SECRET), and events for other bots are ignored.

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const provided = typeof query.token === 'string' ? query.token : getHeader(event, 'x-kora-webhook-token')
  if (!verifyWebhookToken(provided)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook token.' })
  }

  const payload = await readBody(event).catch(() => null)
  if (!payload) throw createError({ statusCode: 400, statusMessage: 'Invalid JSON.' })

  const { messages, failures } = parseSendPulseWebhook(payload, getWhatsAppConfig().botId || undefined)

  for (const message of messages) {
    try {
      await handleInbound(message)
    } catch (error) {
      // Log and carry on so one bad event doesn't make SendPulse retry the batch.
      console.error('[whatsapp] failed to handle message', message.providerMessageId, error)
    }
  }

  for (const failure of failures) {
    try {
      await handleStatus({ id: failure.providerMessageId, status: 'failed', error: failure.error })
    } catch (error) {
      console.error('[whatsapp] failed to record delivery failure', failure.providerMessageId, error)
    }
  }

  return { received: true, messages: messages.length, failures: failures.length }
})
