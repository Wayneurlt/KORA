import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

// Thin client for the Meta WhatsApp Cloud API.
//
// When WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not set, sends run in
// *test mode*: nothing leaves the server, the message is logged and reported as
// sent with a "sim_" id. That keeps the whole flow testable locally.

export interface WhatsAppConfig {
  apiUrl: string
  accessToken: string
  phoneNumberId: string
  verifyToken: string
  appSecret: string
  announcementTemplate: string
  templateLanguage: string
}

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    apiUrl: (process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0').replace(/\/$/, ''),
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    announcementTemplate: process.env.WHATSAPP_ANNOUNCEMENT_TEMPLATE || '',
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en'
  }
}

export function isWhatsAppLive(config = getWhatsAppConfig()) {
  return !!(config.accessToken && config.phoneNumberId)
}

export interface SendResult {
  ok: boolean
  providerMessageId: string | null
  simulated: boolean
  error?: string
  /** Meta error code, e.g. 131047 = outside the 24-hour customer service window */
  errorCode?: number
}

interface GraphResponse {
  messages?: { id: string }[]
  error?: { message?: string, code?: number, error_data?: { details?: string } }
}

async function send(to: string, payload: Record<string, unknown>, preview: string): Promise<SendResult> {
  const config = getWhatsAppConfig()

  if (!isWhatsAppLive(config)) {
    console.info(`[whatsapp:test-mode] → +${to}: ${preview.replace(/\s+/g, ' ').slice(0, 160)}`)
    return { ok: true, providerMessageId: `sim_${randomUUID()}`, simulated: true }
  }

  try {
    const response = await $fetch.raw<GraphResponse>(`${config.apiUrl}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.accessToken}` },
      body: { messaging_product: 'whatsapp', recipient_type: 'individual', to, ...payload },
      ignoreResponseError: true,
      timeout: 15_000
    })
    const data = response._data
    const providerMessageId = data?.messages?.[0]?.id ?? null
    if (response.ok && providerMessageId) {
      return { ok: true, providerMessageId, simulated: false }
    }
    const error = data?.error
    return {
      ok: false,
      providerMessageId: null,
      simulated: false,
      error: error?.error_data?.details || error?.message || `WhatsApp API error (${response.status})`,
      errorCode: error?.code
    }
  } catch (error) {
    return { ok: false, providerMessageId: null, simulated: false, error: (error as Error).message || 'Could not reach WhatsApp' }
  }
}

export function sendWhatsAppText(to: string, body: string) {
  return send(to, { type: 'text', text: { body: body.slice(0, 4096), preview_url: false } }, body)
}

export function sendWhatsAppTemplate(to: string, name: string, params: string[], language = getWhatsAppConfig().templateLanguage) {
  return send(to, {
    type: 'template',
    template: {
      name,
      language: { code: language },
      components: params.length
        ? [{ type: 'body', parameters: params.map(text => ({ type: 'text', text: text.slice(0, 1024) })) }]
        : []
    }
  }, `[template ${name}] ${params.join(' | ')}`)
}

/**
 * Verifies Meta's X-Hub-Signature-256 header against the raw request body.
 * Without WHATSAPP_APP_SECRET the check is skipped outside production only.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined, appSecret = getWhatsAppConfig().appSecret) {
  if (!appSecret) return process.env.NODE_ENV !== 'production'
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = Buffer.from(createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex'))
  const received = Buffer.from(signatureHeader.slice('sha256='.length))
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/** True when the parent wrote to us within the last 24 hours (free-form replies allowed). */
export function withinServiceWindow(lastInboundAt: Date | null | undefined, now = Date.now()) {
  return !!lastInboundAt && now - lastInboundAt.getTime() < 24 * 60 * 60 * 1000
}
