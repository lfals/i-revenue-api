import { createClient } from '@libsql/client/node'
import { drizzle } from 'drizzle-orm/libsql'
import { env } from '../../config/env'

const client = createClient({
  url: env.LOCAL_DB,
  authToken: env.TURSO_AUTH_TOKEN,
  syncUrl: env.TURSO_DATABASE_URL,
  syncInterval: 15,
  encryptionKey: env.SECRET,
})

export const db = drizzle(client)
