import { sign, verify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { usersTable } from '../db/schema'

type JWTPayload = {
    id: typeof usersTable.$inferInsert['id']
    name: typeof usersTable.$inferInsert['name']
}
const secretKey = process.env.JWT_SECRET!
const alg = 'HS256'

export async function generateJWT(payload: JWTPayload) {
    const data = {
        ...payload,
        sub: payload.id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }


    try {
        const token = await sign(data, secretKey, alg)
        return token
    } catch (error) {
        return error
    }
}

export async function validateJWT(tokenToVerify: string): Promise<boolean> {


    try {
        const decodedPayload = await verify(tokenToVerify, secretKey, alg)

        console.log(decodedPayload)
        return true
    } catch (error) {
        throw new HTTPException(401, {
            message: 'Usuário não autenticado',
            res: new Response('Usuário não autenticado', {
                status: 401,
                headers: {
                    'WWW-Authenticate': 'Bearer error="invalid_token"',
                },
            }),
        })
    }
}
