import { randomInt } from 'node:crypto'

// Readable one-time passwords for new staff / admin resets, e.g. "kora-7HQ4-M2XP".
// No 0/O/1/I/L to avoid mix-ups when read out loud or copied by hand.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateTempPassword() {
  const chunk = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `kora-${chunk()}-${chunk()}`
}
