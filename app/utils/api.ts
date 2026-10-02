/** Readable message from a failed $fetch call (our APIs put it in statusMessage). */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const data = (error as { data?: { statusMessage?: string, message?: string } })?.data
  return data?.statusMessage || data?.message || fallback
}
