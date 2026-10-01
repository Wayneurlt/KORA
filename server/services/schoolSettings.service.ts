import { prisma } from '../utils/prisma'
import type { SchoolSettingsInput } from '../validators/schoolSettings'

const DEFAULT_NAME = 'My School'

/**
 * There is exactly one school in this system. Rather than enforcing that
 * with a database trick, we always read/write the first row and create it
 * on first access.
 */
export async function getSchoolSettings() {
  const existing = await prisma.schoolSettings.findFirst({
    orderBy: { createdAt: 'asc' }
  })

  if (existing) return existing

  return prisma.schoolSettings.create({
    data: { name: DEFAULT_NAME }
  })
}

export async function updateSchoolSettings(input: SchoolSettingsInput) {
  const current = await getSchoolSettings()

  return prisma.schoolSettings.update({
    where: { id: current.id },
    data: {
      name: input.name,
      logo: input.logo || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      website: input.website || null,
      currency: input.currency,
      timezone: input.timezone
    }
  })
}
