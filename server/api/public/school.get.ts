import { getSchoolSettings } from '../../services/schoolSettings.service'

/**
 * Public, unauthenticated subset of the school settings — used by the
 * marketing/landing page. Never return anything beyond basic contact info
 * here (no WhatsApp tokens, no internal ids beyond what's needed).
 */
export default defineEventHandler(async () => {
  const settings = await getSchoolSettings()

  return {
    name: settings.name,
    logo: settings.logo,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    website: settings.website
  }
})
