import type { AppRole } from '../access'

declare module '#auth-utils' {
  interface User {
    id: string
    name: string
    email: string
    role: AppRole
    /** One-time password in use — must be changed before anything else */
    mustChangePassword?: boolean
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
