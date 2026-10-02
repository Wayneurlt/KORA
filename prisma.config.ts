import { existsSync } from 'node:fs'
import { defineConfig } from 'prisma/config'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts'
  },
  datasource: {
    // Not env(): it throws when the variable is missing, which breaks
    // `prisma generate` in postinstall on CI/Vercel before env vars are set.
    url: process.env.DATABASE_URL ?? ''
  }
})
