import { email, object, string } from 'zod'

export const createUserSchema = object({
    name: string(),
    email: email(),
    password: string(),
})

export const loginSchema = object({
    email: email(),
    password: string()
})