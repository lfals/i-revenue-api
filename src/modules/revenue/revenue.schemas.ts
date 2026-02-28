import { z } from '@hono/zod-openapi'
import { ERROR_CODES, type ErrorCode } from '../../shared/errors/error-codes'

const appErrorCodeValues = Object.values(ERROR_CODES) as [ErrorCode, ...ErrorCode[]]
const revenueTypes = ['clt', 'pj', 'freelance', 'donation', 'other'] as const
const revenueCycles = ['monthly', 'yearly'] as const

export const appErrorCodeSchema = z
  .enum(appErrorCodeValues)
  .openapi({
    description:
      'Códigos de erro de negócio disponíveis em src/shared/errors/error-codes.ts',
    example: ERROR_CODES.REVENUE_NOT_FOUND,
  })

export const errorItemSchema = z.object({
  code: z.union([appErrorCodeSchema, z.string()]).openapi({
    description:
      'Pode retornar um código de negócio (enum) ou um código técnico de validação.',
    example: ERROR_CODES.INVALID_REVENUE_RANGE,
  }),
  message: z.string(),
  path: z.string().optional(),
}).openapi('RevenueApiErrorItem')

export const errorResponseSchema = z.object({
  success: z.boolean().default(false),
  status: z.number(),
  message: z.string(),
  errors: z.array(errorItemSchema),
}).openapi('RevenueErrorResponse')

export const revenueTypeSchema = z.enum(revenueTypes, {
  message: 'Selecione um tipo válido.',
}).openapi('RevenueType')
export const revenueCycleSchema = z.enum(revenueCycles, {
  message: 'Selecione um ciclo válido.',
}).openapi('RevenueCycle')
export const benefitInputSchema = z.object({
  type: z.string().min(1, 'O tipo do benefício é obrigatório.'),
  value: z.number().int('O valor do benefício deve ser um inteiro em centavos.').min(0, 'O valor do benefício deve ser positivo.'),
}).openapi('BenefitInput')

export const benefitItemSchema = z.object({
  id: z.string(),
  revenue_id: z.string(),
  type: z.string(),
  value: z.number(),
}).openapi('Benefit')

export const benefitListItemSchema = z.object({
  type: z.string(),
  value: z.number(),
}).openapi('BenefitListItem')

export const revenueInputSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  type: revenueTypeSchema.openapi({
    example: 'clt',
  }),
  revenueAsRange: z.boolean(),
  min_revenue: z.number().min(0, 'A receita deve ser um número positivo.'),
  max_revenue: z.number().min(0, 'A receita deve ser um número positivo.').nullable().optional(),
  cycle: revenueCycleSchema.openapi({
    example: 'monthly',
  }),
  benefits: z.array(benefitInputSchema).default([]),
}).superRefine((data, ctx) => {
  if (data.revenueAsRange && data.max_revenue == null) {
    ctx.addIssue({
      code: 'custom',
      message: 'O campo de receita máxima é obrigatório.',
      path: ['max_revenue'],
    })
  }

  if (data.revenueAsRange && data.max_revenue != null && data.max_revenue < data.min_revenue) {
    ctx.addIssue({
      code: 'custom',
      message: 'A receita máxima deve ser maior ou igual à receita mínima.',
      path: ['max_revenue'],
    })
  }
}).openapi('RevenueInput')

export const revenueIdParamSchema = z.object({
  id: z.string().min(1),
}).openapi('RevenueIdParams')

export const revenueItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: revenueTypeSchema,
  revenueAsRange: z.boolean(),
  min_revenue: z.number(),
  max_revenue: z.number().nullable(),
  cycle: revenueCycleSchema,
  benefits: z.array(benefitItemSchema),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
}).openapi('Revenue')

export const revenueListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: revenueTypeSchema,
  min_revenue: z.number(),
  max_revenue: z.number().nullable(),
  cycle: revenueCycleSchema,
  benefits: z.array(benefitListItemSchema),
}).openapi('RevenueListItem')

export const revenueDetailItemSchema = z.object({
  name: z.string(),
  type: revenueTypeSchema,
  min_revenue: z.number(),
  max_revenue: z.number().nullable(),
  cycle: revenueCycleSchema,
  benefits: z.array(benefitItemSchema),
}).openapi('RevenueDetailItem')

export const revenueResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
  data: revenueItemSchema,
}).openapi('RevenueResponse')

export const revenueDetailResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
  data: revenueDetailItemSchema,
}).openapi('RevenueDetailResponse')

export const revenueListResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
  data: z.array(revenueListItemSchema),
}).openapi('RevenueListResponse')

export const revenueDeleteResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
  data: z.object({
    id: z.string(),
  }),
}).openapi('RevenueDeleteResponse')

export type RevenueInput = z.infer<typeof revenueInputSchema>
export type RevenueIdParams = z.infer<typeof revenueIdParamSchema>
export type RevenueItem = z.infer<typeof revenueItemSchema>
export type RevenueListItem = z.infer<typeof revenueListItemSchema>
export type RevenueDetailItem = z.infer<typeof revenueDetailItemSchema>
export type BenefitInput = z.infer<typeof benefitInputSchema>
export type BenefitItem = z.infer<typeof benefitItemSchema>
export type BenefitListItem = z.infer<typeof benefitListItemSchema>
