import type { AppRole } from '../access'

declare module '#auth-utils' {
  interface User {
    id: string
    name: string
    email: string
    role: AppRole
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
