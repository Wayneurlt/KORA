// Parses SendPulse chatbot webhook payloads (pure — unit tested).
// Docs: https://sendpulse.com/integrations/api/chatbot/webhooks

export interface ParsedInbound {
  /** Sender's phone number — missing when WhatsApp hides it (accounts with a username) */
  from: string | null
  /** SendPulse contact id — always present, stable for this bot */
  contactId: string | null
  providerMessageId: string
  text: string | null
  type: string
  timestamp?: Date
  profileName?: string
}

export interface ParsedFailure {
  providerMessageId: string
  error: string
}

interface SendPulseEvent {
  title?: string
  service?: string
  date?: number
  bot?: { id?: string }
  contact?: {
    id?: string
    name?: string
    username?: string
    phone?: string | number | null
    channel_data?: { name?: string, username?: string, phone?: string | number | null }
    variables?: Record<string, unknown>
  }
  info?: {
    message_id?: string
    error_message?: string
    error_code?: number
    message?: {
      id?: string
      channel_data?: {
        message_id?: string
        message?: {
          id?: string
          from?: string | number
          type?: string
          timestamp?: number
          text?: { body?: string } | null
          button?: { text?: string } | null
          interactive?: { button_reply?: { title?: string }, list_reply?: { title?: string } } | null
        }
      }
    }
  }
}

export function parseSendPulseWebhook(payload: unknown, botId?: string) {
  const events = (Array.isArray(payload) ? payload : [payload]) as SendPulseEvent[]
  const messages: ParsedInbound[] = []
  const failures: ParsedFailure[] = []

  for (const event of events) {
    if (!event || typeof event !== 'object') continue
    if (event.service && event.service !== 'whatsapp') continue
    // Ignore other bots on the same SendPulse account.
    if (botId && event.bot?.id && event.bot.id !== botId) continue

    if (event.title === 'incoming_message') {
      const channel = event.info?.message?.channel_data
      const message = channel?.message
      const from = message?.from ?? event.contact?.phone ?? event.contact?.channel_data?.phone ?? event.contact?.variables?.Phone
      const contactId = event.contact?.id
      const providerMessageId = message?.id ?? channel?.message_id ?? event.info?.message?.id
      // Senders with a WhatsApp username arrive without a number; the contact id still identifies them.
      if ((!from && !contactId) || !providerMessageId) continue

      messages.push({
        from: from ? String(from) : null,
        contactId: contactId ? String(contactId) : null,
        providerMessageId: String(providerMessageId),
        text: message?.text?.body
          ?? message?.button?.text
          ?? message?.interactive?.button_reply?.title
          ?? message?.interactive?.list_reply?.title
          ?? null,
        type: message?.type ?? 'text',
        timestamp: message?.timestamp ? new Date(message.timestamp * 1000) : event.date ? new Date(event.date * 1000) : undefined,
        profileName: event.contact?.name ?? event.contact?.channel_data?.name ?? event.contact?.username ?? event.contact?.channel_data?.username
      })
    } else if (event.title === 'failed_delivery' && event.info?.message_id) {
      failures.push({
        providerMessageId: String(event.info.message_id),
        error: event.info.error_message ?? `Delivery failed${event.info.error_code ? ` (${event.info.error_code})` : ''}`
      })
    }
  }

  return { messages, failures }
}
