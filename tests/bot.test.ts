import { describe, expect, it } from 'vitest'
import { menuText, money, parseIntent, sameAdmissionNumber } from '../server/services/bot.intents'

describe('parseIntent', () => {
  it.each([
    ['hi', 'MENU'],
    ['Hello!', 'MENU'],
    ['Good morning', 'MENU'],
    ['0', 'MENU'],
    ['1', 'RESULTS'],
    ['Results', 'RESULTS'],
    ['report card', 'RESULTS'],
    ['results for brian please', 'RESULTS'],
    ['2', 'BALANCE'],
    ['FEES', 'BALANCE'],
    ['balance?', 'BALANCE'],
    ['3', 'NEWS'],
    ['announcements', 'NEWS'],
    ['4', 'CHILDREN'],
    ['my children', 'CHILDREN'],
    ['5', 'AGENT'],
    ['talk to school', 'AGENT'],
    ['help', 'AGENT']
  ])('%j → %s', (text, intent) => {
    expect(parseIntent(text)).toBe(intent)
  })

  it.each(['', '   ', 'what time is pickup on friday', '12', '👍'])('%j is not understood', (text) => {
    expect(parseIntent(text)).toBe('UNKNOWN')
  })
})

describe('sameAdmissionNumber', () => {
  it('ignores case, spaces and dashes', () => {
    expect(sameAdmissionNumber('KOR-2021', 'kor2021')).toBe(true)
    expect(sameAdmissionNumber('KOR-2021', ' KOR 2021 ')).toBe(true)
  })

  it('rejects different or empty numbers', () => {
    expect(sameAdmissionNumber('KOR-2021', 'KOR-2022')).toBe(false)
    expect(sameAdmissionNumber('KOR-2021', '')).toBe(false)
    expect(sameAdmissionNumber('', '')).toBe(false)
  })
})

describe('reply formatting', () => {
  it('lists every menu option', () => {
    const text = menuText('Kora', 'Esther')
    expect(text).toContain('Hi Esther')
    for (const option of ['*1*', '*2*', '*3*', '*4*', '*5*']) expect(text).toContain(option)
  })

  it('formats money without decimals', () => {
    expect(money(22000, 'KES')).toBe('KES 22,000')
    expect(money(1234.6, 'KES')).toBe('KES 1,235')
  })
})
