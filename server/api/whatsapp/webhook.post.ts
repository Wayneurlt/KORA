import { verifyWebhookSignature } from '../../utils/whatsapp'
import { handleInbound, handleStatus } from '../../services/bot.service'

// Incoming WhatsApp messages and delivery-status callbacks from Meta.
// Public route: authenticity comes from the X-Hub-Signature-256 HMAC.

interface WebhookPayload {
  entry?: {
    changes?: {
      value?: {
        contacts?: { wa_id: string, profile?: { name?: string } }[]
        messages?: {
          id: string
          from: string
          timestamp?: string
          type: string
          text?: { body?: string }
          button?: { text?: string }
          interactive?: { button_reply?: { title?: string }, list_reply?: { title?: string } }
        }[]
        statuses?: { id: string, status: string, errors?: { title?: string, message?: string }[] }[]
      }
    }[]
  }[]
}

export default defineEventHandler(async (event) => {
  const rawBody = (await readRawBody(event, 'utf8')) ?? ''
  if (!verifyWebhookSignature(rawBody, getHeader(event, 'x-hub-signature-256'))) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature.' })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON.' })
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {}

      for (const message of value.messages ?? []) {
        const text = message.text?.body
          ?? message.button?.text
          ?? message.interactive?.button_reply?.title
          ?? message.interactive?.list_reply?.title
          ?? null
        try {
          await handleInbound({
            from: message.from,
            providerMessageId: message.id,
            text,
            type: message.type,
            timestamp: message.timestamp ? new Date(Number(message.timestamp) * 1000) : undefined,
            profileName: value.contacts?.find(contact => contact.wa_id === message.from)?.profile?.name
          })
        } catch (error) {
          // Log and carry on: a 5xx makes Meta retry the whole batch.
          console.error('[whatsapp] failed to handle message', message.id, error)
        }
      }

      for (const status of value.statuses ?? []) {
        try {
          await handleStatus({
            id: status.id,
            status: status.status,
            error: status.errors?.[0]?.message ?? status.errors?.[0]?.title
          })
        } catch (error) {
          console.error('[whatsapp] failed to handle status', status.id, error)
        }
      }
    }
  }

  return { received: true }
})
