import { prisma } from '../../utils/prisma'
import { loginSchema } from '../../validators/auth'
import { verifyPasswordScrypt } from '../../utils/password'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid email and password.' })
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.status !== 'ACTIVE') {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password.' })
  }

  const valid = await verifyPasswordScrypt(user.passwordHash, password)

  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password.' })
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    loggedInAt: Date.now()
  })

  return { id: user.id, name: user.name, email: user.email, role: user.role }
})
