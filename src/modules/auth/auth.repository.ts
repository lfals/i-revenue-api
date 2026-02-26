import { eq } from 'drizzle-orm'
import { db } from '../../infra/db/client'
import { usersTable } from '../../infra/db/schema'
import type { RegisterInput } from './auth.schemas'

type PublicUser = {
  id: string
  name: string
}

type UserWithPassword = {
  id: string
  name: string
  password: string
}

export class AuthRepository {
  async createUser(input: RegisterInput & { password: string }): Promise<PublicUser | null> {
    const userToSave: typeof usersTable.$inferInsert = {
      name: input.name,
      email: input.email,
      password: input.password,
    }

    const userSaved = await db
      .insert(usersTable)
      .values(userToSave)
      .returning({
        id: usersTable.id,
        name: usersTable.name,
      })
      .onConflictDoNothing()

    return userSaved[0] ?? null
  }

  async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        password: usersTable.password,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)

    return users[0] ?? null
  }
}
