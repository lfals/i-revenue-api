import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import auth from './routes/auth'
import { drizzle } from 'drizzle-orm/libsql';
import { prettyJSON } from 'hono/pretty-json'


const app = new Hono()
const startedAt = Date.now()

app.use(prettyJSON()) // With options: prettyJSON({ space: 4 })


export const db = drizzle({
  connection: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
  }
});

app.route('/auth', auth)

app.get('/health', (c) => {
  return c.json({
    uptime: `${Math.floor((Date.now() - startedAt) / 1000)}s`,
  })
})

app.use('/api/*', bearerAuth({
  verifyToken: async (token, c) => {
    console.log(token, c)
    return true
  },
}))

app.get('/api/page', (c) => {
  return c.json({ message: 'You are authorized' })
})

export default app
