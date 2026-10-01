import { z } from 'zod'

export const schoolSettingsSchema = z.object({
  name: z.string().trim().min(1, 'School name is required').max(200),
  logo: z.string().trim().url('Logo must be a valid URL').optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  website: z.string().trim().url('Website must be a valid URL').optional().or(z.literal('')),
  currency: z.string().trim().length(3, 'Use a 3-letter currency code, e.g. KES').toUpperCase(),
  timezone: z.string().trim().min(1, 'Timezone is required')
})

export type SchoolSettingsInput = z.infer<typeof schoolSettingsSchema>
