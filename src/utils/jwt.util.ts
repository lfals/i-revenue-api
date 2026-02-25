import { sign } from 'hono/jwt'
import { usersTable } from '../db/schema'

type JWTPayload = {
    id: typeof usersTable.$inferInsert['id']
    name: typeof usersTable.$inferInsert['name']
}

export async function generateJWT(payload: JWTPayload) {
    const data = {
        ...payload,
        sub: payload.id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }

    const secret = process.env.JWT_SECRET!

    try {
        const token = await sign(data, secret)
        return token
    } catch (error) {
        return error
    }
}