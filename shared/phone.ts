// Phone numbers are stored as international digits without "+", e.g. 254712345678,
// which is also the format the WhatsApp Cloud API uses for `wa_id`.

const DEFAULT_COUNTRY_CODE = '254' // Kenya

/**
 * Normalises user-typed numbers: "0712 345 678", "+254 712-345-678",
 * "712345678" and "254712345678" all become "254712345678".
 * Returns null when the result can't be a valid international number.
 */
export function normalizePhone(input: string, countryCode = DEFAULT_COUNTRY_CODE): string | null {
  let digits = input.replace(/[^\d]/g, '')
  if (!digits) return null

  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = countryCode + digits.slice(1)
  else if (digits.length === 9 && !digits.startsWith(countryCode)) digits = countryCode + digits

  return digits.length >= 10 && digits.length <= 15 ? digits : null
}
