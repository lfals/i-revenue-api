import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createUserSchema, loginSchema } from '../model/user.model'
import { db } from '..'
import { usersTable } from '../db/schema'
import { sign } from 'hono/jwt'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { password } from 'bun'
import { generateJWT } from '../utils/jwt.util'

const auth = new Hono()



auth.post(
    '/register',
    zValidator('json', createUserSchema),
    async (c) => {
        try {
            const validated = c.req.valid('json')

            const hash = await Bun.password.hash(validated.password);

            const userToSave: typeof usersTable.$inferInsert = {
                ...validated,
                password: hash
            }

            const userSaved = await db.insert(usersTable).values(userToSave).returning({
                id: usersTable.id,
                name: usersTable.name
            })

            const token = await generateJWT({
                name: userSaved[0].name,
                id: userSaved[0].id,
            })

            return c.json({ message: "Usuário criado com sucesso", user: { ...userSaved[0], token } }, 201)
        } catch (error) {
            console.error('[auth/register] unexpected error', error)
            return c.json({ message: 'Erro interno ao criar usuário' }, 500)
        }
    })

auth.post('/login',
    zValidator('json', loginSchema),
    async (c) => {
        const validated = c.req.valid('json')
        try {
            const userFound = await db.selectDistinct({
                id: usersTable.id,
                name: usersTable.name,
                password: usersTable.password
            }).from(usersTable).where(eq(usersTable.email, validated.email))

            if (!userFound) {
                throw new HTTPException(401, { message: 'Email e ou senha incorretos' })
            }

            const passwordIsValid = await Bun.password.verify(validated.password, userFound[0].password)


            console.log(passwordIsValid)
            console.log(userFound)
            console.log(validated)

            if (!passwordIsValid) {
                throw new HTTPException(401, { message: 'Email e ou senha incorretos' })
            }

            const token = await generateJWT({
                name: userFound[0].name,
                id: userFound[0].id,
            })

            return c.json({ id: userFound[0].id, name: userFound[0].name, token }, 200)
        } catch (error) {
            return c.json({ message: "erro", error }, 400)
        }
    })

export default auth
