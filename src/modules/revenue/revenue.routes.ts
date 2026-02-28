import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { openApiValidatorHook } from '../../shared/http/openapi-validator-hook'
import { RevenueController } from './revenue.controller'
import { RevenueRepository } from './revenue.repository'
import {
  revenueDetailResponseSchema,
  errorResponseSchema,
  revenueDeleteResponseSchema,
  revenueIdParamSchema,
  revenueInputSchema,
  revenueListResponseSchema,
  revenueResponseSchema,
} from './revenue.schemas'
import { RevenueService } from './revenue.service'

const revenueRoutes = new OpenAPIHono<{
  Variables: { authUser: { id: string; name: string } }
}>({
  defaultHook: openApiValidatorHook,
})

const revenueRepository = new RevenueRepository()
const revenueService = new RevenueService(revenueRepository)
const revenueController = new RevenueController(revenueService)
const bearerSecurity = [{ BearerAuth: [] }]

const createRevenueRoute = createRoute({
  method: 'post',
  path: '/revenues',
  tags: ['Revenue'],
  summary: 'Cria uma renda para o usuário autenticado',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: revenueInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Renda criada com sucesso',
      content: {
        'application/json': {
          schema: revenueResponseSchema,
        },
      },
    },
    400: {
      description: 'Dados inválidos',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
})

const listRevenueRoute = createRoute({
  method: 'get',
  path: '/revenues',
  tags: ['Revenue'],
  summary: 'Lista as rendas do usuário autenticado',
  security: bearerSecurity,
  responses: {
    200: {
      description: 'Rendas listadas com sucesso',
      content: {
        'application/json': {
          schema: revenueListResponseSchema,
        },
      },
    },
  },
})

const getRevenueRoute = createRoute({
  method: 'get',
  path: '/revenues/{id}',
  tags: ['Revenue'],
  summary: 'Busca uma renda do usuário autenticado',
  security: bearerSecurity,
  request: {
    params: revenueIdParamSchema,
  },
  responses: {
    200: {
      description: 'Renda encontrada com sucesso',
      content: {
        'application/json': {
          schema: revenueDetailResponseSchema,
        },
      },
    },
    404: {
      description: 'Renda não encontrada',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
})

const updateRevenueRoute = createRoute({
  method: 'put',
  path: '/revenues/{id}',
  tags: ['Revenue'],
  summary: 'Atualiza uma renda do usuário autenticado',
  security: bearerSecurity,
  request: {
    params: revenueIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: revenueInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Renda atualizada com sucesso',
      content: {
        'application/json': {
          schema: revenueResponseSchema,
        },
      },
    },
    404: {
      description: 'Renda não encontrada',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
})

const deleteRevenueRoute = createRoute({
  method: 'delete',
  path: '/revenues/{id}',
  tags: ['Revenue'],
  summary: 'Remove uma renda do usuário autenticado',
  security: bearerSecurity,
  request: {
    params: revenueIdParamSchema,
  },
  responses: {
    200: {
      description: 'Renda removida com sucesso',
      content: {
        'application/json': {
          schema: revenueDeleteResponseSchema,
        },
      },
    },
    404: {
      description: 'Renda não encontrada',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
})

revenueRoutes.openapi(createRevenueRoute, (c) => revenueController.create(c, c.req.valid('json')))
revenueRoutes.openapi(listRevenueRoute, (c) => revenueController.list(c))
revenueRoutes.openapi(getRevenueRoute, (c) => revenueController.findById(c, c.req.valid('param')))
revenueRoutes.openapi(updateRevenueRoute, (c) =>
  revenueController.update(c, c.req.valid('param'), c.req.valid('json')))
revenueRoutes.openapi(deleteRevenueRoute, (c) => revenueController.delete(c, c.req.valid('param')))

export default revenueRoutes
