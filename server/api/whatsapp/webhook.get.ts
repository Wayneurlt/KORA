import { getWhatsAppConfig } from '../../utils/whatsapp'

// Meta's one-time webhook verification handshake (configured in the Meta app dashboard).
export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { verifyToken } = getWhatsAppConfig()

  if (query['hub.mode'] === 'subscribe' && verifyToken && query['hub.verify_token'] === verifyToken) {
    setResponseHeader(event, 'content-type', 'text/plain')
    return String(query['hub.challenge'] ?? '')
  }

  throw createError({ statusCode: 403, statusMessage: 'Webhook verification failed.' })
})
