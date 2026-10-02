import { describe, expect, it } from 'vitest'
import { normalizePhone } from '../shared/phone'

describe('normalizePhone', () => {
  it.each([
    ['0712345678', '254712345678'],
    ['0712 345 678', '254712345678'],
    ['+254 712-345-678', '254712345678'],
    ['254712345678', '254712345678'],
    ['712345678', '254712345678'],
    ['00254712345678', '254712345678'],
    ['0110 123 456', '254110123456']
  ])('normalises %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it('keeps other countries\' international numbers', () => {
    expect(normalizePhone('+256 772 123456')).toBe('256772123456')
  })

  it.each(['', 'abc', '12345', '+1234567890123456'])('rejects %j', (input) => {
    expect(normalizePhone(input)).toBeNull()
  })
})
