import { describe, expect, it } from 'vitest'
import { parseSendPulseWebhook } from '../server/services/sendpulse.webhook'
import { splitMessage, templateParam, TEXT_LIMIT } from '../server/utils/whatsapp'

// Shape taken from SendPulse's webhook documentation example.
function incoming(overrides: { text?: string | null, from?: string | number, botId?: string, service?: string, id?: string } = {}) {
  return {
    info: {
      message: {
        channel_data: {
          message: {
            from: overrides.from ?? 254700000004,
            text: overrides.text === null ? null : { body: overrides.text ?? 'hi' },
            button: null,
            interactive: null,
            timestamp: 1625834714,
            type: 'text',
            id: overrides.id ?? 'wamid.ABC123'
          },
          message_id: 'ABCDOAk1Z43535'
        },
        id: '60e8434b446846838d8463'
      }
    },
    service: overrides.service ?? 'whatsapp',
    title: 'incoming_message',
    bot: { url: 'https://wa.me/254700123456', external_id: '254700123456', id: overrides.botId ?? 'bot-1', name: 'Kora' },
    contact: { name: 'Esther', id: 'contact-1', variables: {} },
    date: 1625834714
  }
}

describe('parseSendPulseWebhook', () => {
  it('extracts incoming WhatsApp messages from the event array', () => {
    const { messages, failures } = parseSendPulseWebhook([incoming({ text: '2' })], 'bot-1')
    expect(failures).toEqual([])
    expect(messages).toEqual([{
      from: '254700000004',
      providerMessageId: 'wamid.ABC123',
      text: '2',
      type: 'text',
      timestamp: new Date(1625834714 * 1000),
      profileName: 'Esther'
    }])
  })

  it('accepts a single event object as well as an array', () => {
    expect(parseSendPulseWebhook(incoming(), 'bot-1').messages).toHaveLength(1)
  })

  it('ignores other bots, other channels and outgoing events', () => {
    const payload = [
      incoming({ botId: 'someone-else' }),
      incoming({ service: 'telegram' }),
      { ...incoming(), title: 'outgoing_message' }
    ]
    expect(parseSendPulseWebhook(payload, 'bot-1').messages).toEqual([])
  })

  it('reads button and list replies as text, and keeps non-text messages with null text', () => {
    const button = incoming()
    button.info.message.channel_data.message.text = null as never
    ;(button.info.message.channel_data.message as Record<string, unknown>).button = { text: 'Fee balance' }
    expect(parseSendPulseWebhook([button]).messages[0]?.text).toBe('Fee balance')

    const image = incoming({ text: null })
    image.info.message.channel_data.message.type = 'image'
    const parsed = parseSendPulseWebhook([image]).messages[0]
    expect(parsed?.text).toBeNull()
    expect(parsed?.type).toBe('image')
  })

  it('collects failed deliveries by message id', () => {
    const { failures } = parseSendPulseWebhook([{
      service: 'whatsapp',
      title: 'failed_delivery',
      info: { timestamp: 1783517662, error_message: 'Message undeliverable', error_code: 131026, message_id: 'msg-9' }
    }])
    expect(failures).toEqual([{ providerMessageId: 'msg-9', error: 'Message undeliverable' }])
  })

  it('skips malformed events instead of throwing', () => {
    expect(parseSendPulseWebhook([null, 'x', {}, { title: 'incoming_message' }]).messages).toEqual([])
  })
})

describe('splitMessage', () => {
  it('leaves short messages alone', () => {
    expect(splitMessage('Hello parents')).toEqual(['Hello parents'])
  })

  it('splits long messages under the limit, at paragraph boundaries', () => {
    const paragraph = 'Results for one child. '.repeat(20).trim()
    const text = Array.from({ length: 6 }, () => paragraph).join('\n\n')
    const chunks = splitMessage(text)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(TEXT_LIMIT)
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' '))
  })

  it('hard-splits text with no spaces', () => {
    const chunks = splitMessage('x'.repeat(2500))
    expect(chunks.map(chunk => chunk.length)).toEqual([1000, 1000, 500])
  })
})

describe('templateParam', () => {
  it('removes new lines, tabs and long runs of spaces (WhatsApp rejects them)', () => {
    expect(templateParam('Dear parents,\n\nSports day is Friday.\nBring water.')).toBe('Dear parents, · Sports day is Friday. · Bring water.')
    expect(templateParam('a\tb      c')).toBe('a b   c')
  })

  it('caps parameters at 1024 characters', () => {
    expect(templateParam('y'.repeat(2000))).toHaveLength(1024)
  })
})
