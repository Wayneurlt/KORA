// Pure helpers for the WhatsApp auto-reply bot — no database access, so they're unit-testable.

export type Intent = 'MENU' | 'RESULTS' | 'BALANCE' | 'NEWS' | 'CHILDREN' | 'AGENT' | 'UNKNOWN'

const KEYWORDS: [Intent, string[]][] = [
  ['MENU', ['0', 'hi', 'hello', 'hey', 'menu', 'start', 'habari', 'jambo', 'good morning', 'good afternoon', 'good evening']],
  ['RESULTS', ['1', 'results', 'result', 'report', 'report card', 'marks', 'grades', 'exam', 'exams']],
  ['BALANCE', ['2', 'balance', 'fees', 'fee', 'fee balance', 'school fees', 'pay', 'payment']],
  ['NEWS', ['3', 'news', 'notices', 'notice', 'announcements', 'announcement', 'updates']],
  ['CHILDREN', ['4', 'children', 'my children', 'child', 'kids', 'students']],
  ['AGENT', ['5', 'agent', 'talk', 'talk to school', 'human', 'staff', 'help', 'call me', 'support']]
]

export function parseIntent(text: string): Intent {
  const cleaned = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return 'UNKNOWN'
  for (const [intent, words] of KEYWORDS) {
    if (words.includes(cleaned)) return intent
  }
  // Single keyword at the start, e.g. "balance please", "results for brian"
  const first = cleaned.split(' ')[0]!
  for (const [intent, words] of KEYWORDS) {
    if (first.length > 1 && words.includes(first)) return intent
  }
  return 'UNKNOWN'
}

export function menuText(schoolName: string, parentFirstName?: string) {
  return [
    `Hi${parentFirstName ? ` ${parentFirstName}` : ''} 👋 Welcome to *${schoolName}*.`,
    'Reply with a number:',
    '',
    '*1* · Exam results',
    '*2* · Fee balance',
    '*3* · Latest announcements',
    '*4* · My children',
    '*5* · Talk to the school'
  ].join('\n')
}

/** Admission numbers are compared without spaces/dashes and case-insensitively. */
export function sameAdmissionNumber(a: string, b: string) {
  const clean = (value: string) => value.toUpperCase().replace(/[\s-]/g, '')
  return clean(a) === clean(b) && clean(a).length > 0
}

export function money(amount: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`
}
