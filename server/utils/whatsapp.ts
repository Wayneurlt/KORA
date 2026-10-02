import { randomUUID, timingSafeEqual } from 'node:crypto'

// WhatsApp messaging through SendPulse (https://sendpulse.com/integrations/api/chatbot/whatsapp).
//
// When SENDPULSE_CLIENT_ID / SENDPULSE_CLIENT_SECRET / SENDPULSE_BOT_ID are not set,
// sends run in *test mode*: nothing leaves the server, the message is logged and
// reported as sent with a "sim_" id. That keeps the whole flow testable locally.

const API_BASE = 'https://api.sendpulse.com'

// SendPulse caps text messages at 1024 characters; leave a little headroom.
export const TEXT_LIMIT = 1000

export interface WhatsAppConfig {
  clientId: string
  clientSecret: string
  botId: string
  webhookSecret: string
  announcementTemplate: string
  templateLanguage: string
}

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    clientId: process.env.SENDPULSE_CLIENT_ID || '',
    clientSecret: process.env.SENDPULSE_CLIENT_SECRET || '',
    botId: process.env.SENDPULSE_BOT_ID || '',
    webhookSecret: process.env.SENDPULSE_WEBHOOK_SECRET || '',
    announcementTemplate: process.env.WHATSAPP_ANNOUNCEMENT_TEMPLATE || '',
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en'
  }
}

export function isWhatsAppLive(config = getWhatsAppConfig()) {
  return !!(config.clientId && config.clientSecret && config.botId)
}

export interface SendResult {
  ok: boolean
  providerMessageId: string | null
  simulated: boolean
  error?: string
}

// Access tokens last about an hour; cache per server instance.
let token: { value: string, expiresAt: number } | null = null

async function getAccessToken(config: WhatsAppConfig, force = false) {
  if (!force && token && Date.now() < token.expiresAt - 60_000) return token.value
  const data = await $fetch<{ access_token: string, expires_in?: number }>(`${API_BASE}/oauth/access_token`, {
    method: 'POST',
    body: { grant_type: 'client_credentials', client_id: config.clientId, client_secret: config.clientSecret },
    timeout: 15_000
  })
  token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 }
  return token.value
}

interface SendPulseResponse {
  success?: boolean
  data?: { id?: string, message_id?: string } | null
  id?: string
  message?: string
  errors?: Record<string, unknown> | string[]
}

async function post(path: string, body: Record<string, unknown>, preview: string): Promise<SendResult> {
  const config = getWhatsAppConfig()

  if (!isWhatsAppLive(config)) {
    console.info(`[whatsapp:test-mode] → +${String(body.phone)}: ${preview.replace(/\s+/g, ' ').slice(0, 160)}`)
    return { ok: true, providerMessageId: `sim_${randomUUID()}`, simulated: true }
  }

  try {
    let response = await request(config, path, body, false)
    // Token revoked or expired early — refresh once and retry.
    if (response.status === 401) response = await request(config, path, body, true)

    const data = response._data
    if (response.ok && data?.success !== false) {
      return { ok: true, providerMessageId: data?.data?.id ?? data?.data?.message_id ?? data?.id ?? null, simulated: false }
    }
    const detail = data?.message || (Array.isArray(data?.errors) ? data.errors.join(', ') : data?.errors ? JSON.stringify(data.errors) : '')
    return { ok: false, providerMessageId: null, simulated: false, error: detail || `SendPulse error (${response.status})` }
  } catch (error) {
    return { ok: false, providerMessageId: null, simulated: false, error: (error as Error).message || 'Could not reach SendPulse' }
  }
}

async function request(config: WhatsAppConfig, path: string, body: Record<string, unknown>, refreshToken: boolean) {
  const accessToken = await getAccessToken(config, refreshToken)
  return $fetch.raw<SendPulseResponse>(`${API_BASE}/whatsapp${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: { bot_id: config.botId, ...body },
    ignoreResponseError: true,
    timeout: 15_000
  })
}

/**
 * Splits text into chunks under the SendPulse limit, preferring paragraph,
 * then line, then word boundaries.
 */
export function splitMessage(text: string, limit = TEXT_LIMIT): string[] {
  const chunks: string[] = []
  let rest = text.trim()
  while (rest.length > limit) {
    const window = rest.slice(0, limit)
    const cut = [window.lastIndexOf('\n\n'), window.lastIndexOf('\n'), window.lastIndexOf(' ')]
      .find(index => index > limit * 0.5) ?? limit
    chunks.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

/** Sends a text, split into several messages if it's longer than SendPulse allows. */
export async function sendWhatsAppText(to: string, body: string): Promise<SendResult> {
  let last: SendResult = { ok: false, providerMessageId: null, simulated: false, error: 'Empty message' }
  for (const chunk of splitMessage(body)) {
    last = await post('/contacts/sendByPhone', { phone: to, message: { type: 'text', text: { body: chunk } } }, chunk)
    if (!last.ok) return last
  }
  return last
}

/**
 * WhatsApp rejects template parameters containing new lines, tabs or more than
 * four consecutive spaces, so paragraphs are joined with a separator.
 */
export function templateParam(text: string) {
  return text
    .replace(/\s*\n+\s*/g, ' · ')
    .replace(/\t/g, ' ')
    .replace(/ {4,}/g, '   ')
    .trim()
    .slice(0, 1024)
}

export function sendWhatsAppTemplate(to: string, name: string, params: string[], language = getWhatsAppConfig().templateLanguage) {
  return post('/contacts/sendTemplateByPhone', {
    phone: to,
    template: {
      name,
      language: { code: language },
      components: params.length
        ? [{ type: 'body', parameters: params.map(text => ({ type: 'text', text: templateParam(text) })) }]
        : []
    }
  }, `[template ${name}] ${params.join(' | ')}`)
}

/**
 * SendPulse doesn't sign webhooks, so the webhook URL carries a secret token
 * (…/api/whatsapp/webhook?token=…). Without SENDPULSE_WEBHOOK_SECRET the check
 * is skipped outside production only.
 */
export function verifyWebhookToken(provided: string | undefined, secret = getWhatsAppConfig().webhookSecret) {
  if (!secret) return process.env.NODE_ENV !== 'production'
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** True when the parent wrote to us within the last 24 hours (free-form replies allowed). */
export function withinServiceWindow(lastInboundAt: Date | null | undefined, now = Date.now()) {
  return !!lastInboundAt && now - lastInboundAt.getTime() < 24 * 60 * 60 * 1000
}
