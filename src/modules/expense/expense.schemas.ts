import { z } from '@hono/zod-openapi'
import { ERROR_CODES, type ErrorCode } from '../../shared/errors/error-codes'

const appErrorCodeValues = Object.values(ERROR_CODES) as [ErrorCode, ...ErrorCode[]]
const expenseCycles = ['monthly', 'yearly'] as const

export const appErrorCodeSchema = z
  .enum(appErrorCodeValues)
  .openapi({
    description:
      'Códigos de erro de negócio disponíveis em src/shared/errors/error-codes.ts',
    example: ERROR_CODES.EXPENSE_NOT_FOUND,
  })

export const errorItemSchema = z.object({
  code: z.union([appErrorCodeSchema, z.string()]),
  message: z.string(),
  path: z.string().optional(),
}).openapi('ExpenseApiErrorItem')

export const errorResponseSchema = z.object({
  success: z.boolean().default(false),
  status: z.number(),
  message: z.string(),
  errors: z.array(errorItemSchema),
}).openapi('ExpenseErrorResponse')

export const expenseCycleSchema = z.enum(expenseCycles, {
  message: 'Selecione um ciclo válido.',
}).openapi('ExpenseCycle')

export const expenseInputSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  type: z.string().min(1, 'O tipo é obrigatório.'),
  min_revenue: z.number().min(0, 'O valor mínimo deve ser um número positivo.'),
  max_revenue: z.number().min(0, 'O valor máximo deve ser um número positivo.').nullable().optional(),
  cycle: expenseCycleSchema.openapi({
    example: 'monthly',
  }),
}).superRefine((data, ctx) => {
  if (data.max_revenue != null && data.max_revenue < data.min_revenue) {
    ctx.addIssue({
      code: 'custom',
      message: 'O valor máximo deve ser maior ou igual ao valor mínimo.',
      path: ['max_revenue'],
    })
  }
}).openapi('ExpenseInput')

export const expenseIdParamSchema = z.object({
  id: z.string().min(1),
}).openapi('ExpenseIdParams')

export const expenseItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  min_revenue: z.number(),
  max_revenue: z.number().nullable(),
  cycle: expenseCycleSchema,
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
}).openapi('Expense')

export const expenseDetailItemSchema = z.object({
  name: z.string(),
  type: z.string(),
  min_revenue: z.number(),
  max_revenue: z.number().nullable(),
  cycle: expenseCycleSchema,
}).openapi('ExpenseDetailItem')

export const expenseResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
  data: expenseItemSchema,
}).openapi('ExpenseResponse')

export const expenseDetailResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
  data: expenseDetailItemSchema,
}).openapi('ExpenseDetailResponse')

export const expenseListResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
  data: z.array(expenseItemSchema),
}).openapi('ExpenseListResponse')

export const expenseDeleteResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
  data: z.object({
    id: z.string(),
  }),
}).openapi('ExpenseDeleteResponse')

export type ExpenseInput = z.infer<typeof expenseInputSchema>
export type ExpenseIdParams = z.infer<typeof expenseIdParamSchema>
export type ExpenseItem = z.infer<typeof expenseItemSchema>
export type ExpenseDetailItem = z.infer<typeof expenseDetailItemSchema>
