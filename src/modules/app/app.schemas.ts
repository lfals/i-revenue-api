import { z } from '@hono/zod-openapi'

export const dashboardResponseSchema = z
  .object({
    success: z.boolean(),
    status: z.number(),
    message: z.string(),
    data: z.array(z.unknown()),
  })
  .openapi('DashboardResponse')

