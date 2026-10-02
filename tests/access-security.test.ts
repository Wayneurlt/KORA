import { afterEach, describe, expect, it, vi } from 'vitest'
import { canAccessSection, canManageSection, ROLES, SECTIONS } from '../shared/access'
import { verifyWebhookToken, withinServiceWindow } from '../server/utils/whatsapp'
import { generateTempPassword } from '../server/utils/tempPassword'

describe('role access', () => {
  it('gives admins every section', () => {
    for (const section of SECTIONS) expect(canAccessSection('ADMIN', section)).toBe(true)
  })

  it.each([
    ['FINANCE', 'fees', true],
    ['FINANCE', 'results', false],
    ['FINANCE', 'conversations', false],
    ['ACADEMIC', 'results', true],
    ['ACADEMIC', 'fees', false],
    ['SUPPORT', 'conversations', true],
    ['SUPPORT', 'students', false],
    ['SUPPORT', 'staff', false]
  ] as const)('%s → %s: %s', (role, section, allowed) => {
    expect(canAccessSection(role, section)).toBe(allowed)
  })

  it('lets every role see the dashboard', () => {
    for (const role of ROLES) expect(canAccessSection(role, 'dashboard')).toBe(true)
  })

  it('keeps student records admin-managed even for roles that can view them', () => {
    expect(canAccessSection('FINANCE', 'students')).toBe(true)
    expect(canManageSection('FINANCE', 'students')).toBe(false)
    expect(canManageSection('ADMIN', 'students')).toBe(true)
  })

  it('never lets a role manage a section it cannot see', () => {
    for (const role of ROLES) {
      for (const section of SECTIONS) {
        if (canManageSection(role, section)) expect(canAccessSection(role, section)).toBe(true)
      }
    }
  })
})

describe('verifyWebhookToken', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('accepts the configured secret', () => {
    expect(verifyWebhookToken('s3cret-token', 's3cret-token')).toBe(true)
  })

  it('rejects a wrong, partial or missing token', () => {
    expect(verifyWebhookToken('wrong', 's3cret-token')).toBe(false)
    expect(verifyWebhookToken('s3cret', 's3cret-token')).toBe(false)
    expect(verifyWebhookToken(undefined, 's3cret-token')).toBe(false)
  })

  it('without a secret, only allows requests outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(verifyWebhookToken(undefined, '')).toBe(true)
    vi.stubEnv('NODE_ENV', 'production')
    expect(verifyWebhookToken(undefined, '')).toBe(false)
  })
})

describe('withinServiceWindow', () => {
  const now = new Date('2026-10-02T12:00:00Z').getTime()

  it('allows replies within 24 hours of the last inbound message', () => {
    expect(withinServiceWindow(new Date(now - 23 * 60 * 60 * 1000), now)).toBe(true)
  })

  it('blocks after 24 hours or with no inbound message', () => {
    expect(withinServiceWindow(new Date(now - 25 * 60 * 60 * 1000), now)).toBe(false)
    expect(withinServiceWindow(null, now)).toBe(false)
  })
})

describe('generateTempPassword', () => {
  it('produces readable, unambiguous one-time passwords', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const password = generateTempPassword()
      expect(password).toMatch(/^kora-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/)
      seen.add(password)
    }
    expect(seen.size).toBe(50)
  })
})
