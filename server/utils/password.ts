import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

export async function hashPasswordScrypt(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPasswordScrypt(hash: string, password: string): Promise<boolean> {
  const [salt, key] = hash.split(':')
  if (!salt || !key) return false

  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer

  return keyBuffer.length === derivedKey.length && timingSafeEqual(keyBuffer, derivedKey)
}
