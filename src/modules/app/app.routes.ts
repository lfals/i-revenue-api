import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { AppController } from './app.controller'
import { dashboardResponseSchema } from './app.schemas'
import { AppService } from './app.service'

const appRoutes = new OpenAPIHono()

const appService = new AppService()
const appController = new AppController(appService)

const dashboardGetRoute = createRoute({
  method: 'get',
  path: '/dashboard',
  tags: ['App'],
  summary: 'Exemplo GET da rota dashboard',
  responses: {
    200: {
      description: 'Resposta de exemplo para GET',
      content: {
        'application/json': {
          schema: dashboardResponseSchema,
          example: {
            success: true,
            status: 200,
            message: 'Sucesso',
            data: [],
          },
        },
      },
    },
  },
})

const dashboardPostRoute = createRoute({
  method: 'post',
  path: '/dashboard',
  tags: ['App'],
  summary: 'Exemplo POST da rota dashboard',
  responses: {
    200: {
      description: 'Resposta de exemplo para POST',
      content: {
        'application/json': {
          schema: dashboardResponseSchema,
          example: {
            success: true,
            status: 200,
            message: 'Sucesso',
            data: [],
          },
        },
      },
    },
  },
})

const dashboardPutRoute = createRoute({
  method: 'put',
  path: '/dashboard',
  tags: ['App'],
  summary: 'Exemplo PUT da rota dashboard',
  responses: {
    200: {
      description: 'Resposta de exemplo para PUT',
      content: {
        'application/json': {
          schema: dashboardResponseSchema,
          example: {
            success: true,
            status: 200,
            message: 'Sucesso',
            data: [],
          },
        },
      },
    },
  },
})

const dashboardPatchRoute = createRoute({
  method: 'patch',
  path: '/dashboard',
  tags: ['App'],
  summary: 'Exemplo PATCH da rota dashboard',
  responses: {
    200: {
      description: 'Resposta de exemplo para PATCH',
      content: {
        'application/json': {
          schema: dashboardResponseSchema,
          example: {
            success: true,
            status: 200,
            message: 'Sucesso',
            data: [],
          },
        },
      },
    },
  },
})

const dashboardDeleteRoute = createRoute({
  method: 'delete',
  path: '/dashboard',
  tags: ['App'],
  summary: 'Exemplo DELETE da rota dashboard',
  responses: {
    200: {
      description: 'Resposta de exemplo para DELETE',
      content: {
        'application/json': {
          schema: dashboardResponseSchema,
          example: {
            success: true,
            status: 200,
            message: 'Sucesso',
            data: [],
          },
        },
      },
    },
  },
})

appRoutes.openapi(dashboardGetRoute, (c) => appController.getDashboard(c))
appRoutes.openapi(dashboardPostRoute, (c) => appController.createDashboard(c))
appRoutes.openapi(dashboardPutRoute, (c) => appController.replaceDashboard(c))
appRoutes.openapi(dashboardPatchRoute, (c) => appController.updateDashboard(c))
appRoutes.openapi(dashboardDeleteRoute, (c) => appController.deleteDashboard(c))

export default appRoutes
