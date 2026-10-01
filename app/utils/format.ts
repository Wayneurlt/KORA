// Display helpers shared by the dashboard pages.

export function formatMoney(amount: number, currency = 'KES') {
  return `${currency} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`
}

export function formatCompact(amount: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

/** "just now", "5m", "3h", "Yesterday", "Sep 28" */
export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  const diff = Math.max(0, Date.now() - date.getTime())
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  if (hours < 48) return 'Yesterday'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

export function initials(name: string) {
  return name.split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_TONES = ['bg-[#F8B4B4]', 'bg-[#B9E4A8]', 'bg-[#B9C3F5]', 'bg-[#F7D9A6]', 'bg-[#A8E0E4]', 'bg-[#E4B9F0]']

/** Stable pastel avatar colour for a name */
export function avatarTone(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length]
}

export function waLink(number: string) {
  return `https://wa.me/${number.replace(/[^\d]/g, '')}`
}

export type ChipTone = 'green' | 'amber' | 'red' | 'gray' | 'blue' | 'violet'

export const STATUS_TONES: Record<string, ChipTone> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  GRADUATED: 'blue',
  VERIFIED: 'green',
  PENDING: 'amber',
  UNVERIFIED: 'red',
  PUBLISHED: 'green',
  DRAFT: 'amber',
  ARCHIVED: 'gray',
  PAID: 'green',
  PARTIAL: 'amber',
  UNPAID: 'red',
  NO_FEES: 'gray',
  COMPLETED: 'green',
  FAILED: 'red',
  REFUNDED: 'gray',
  OPEN: 'red',
  IN_PROGRESS: 'amber',
  RESOLVED: 'green',
  CLOSED: 'gray'
}

export const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  NO_FEES: 'No fees',
  TALK_TO_SCHOOL: 'Talk to school',
  BANK_TRANSFER: 'Bank transfer',
  MPESA: 'M-Pesa'
}

export function statusLabel(value: string) {
  return STATUS_LABELS[value] ?? value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ')
}
