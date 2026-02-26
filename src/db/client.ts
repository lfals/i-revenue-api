import { createClient } from '@libsql/client/node'
import { drizzle } from 'drizzle-orm/libsql'

const client = createClient({
  url: process.env.LOCAL_DB!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncUrl: process.env.TURSO_DATABASE_URL!,
  syncInterval: 15,
  encryptionKey: process.env.SECRET,
})

export const db = drizzle(client)
