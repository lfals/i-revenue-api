import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { openApiValidatorHook } from '../../shared/http/openapi-validator-hook'
import { ExpenseController } from './expense.controller'
import { ExpenseRepository } from './expense.repository'
import {
  errorResponseSchema,
  expenseDeleteResponseSchema,
  expenseDetailResponseSchema,
  expenseIdParamSchema,
  expenseInputSchema,
  expenseListResponseSchema,
  expenseResponseSchema,
} from './expense.schemas'
import { ExpenseService } from './expense.service'

const expenseRoutes = new OpenAPIHono<{
  Variables: { authUser: { id: string; name: string } }
}>({
  defaultHook: openApiValidatorHook,
})

const expenseRepository = new ExpenseRepository()
const expenseService = new ExpenseService(expenseRepository)
const expenseController = new ExpenseController(expenseService)
const bearerSecurity = [{ BearerAuth: [] }]

const createExpenseRoute = createRoute({
  method: 'post',
  path: '/expenses',
  tags: ['Expense'],
  summary: 'Cria uma despesa para o usuário autenticado',
  security: bearerSecurity,
  request: {
    body: {
      content: {
        'application/json': {
          schema: expenseInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Despesa criada com sucesso',
      content: {
        'application/json': {
          schema: expenseResponseSchema,
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

const listExpenseRoute = createRoute({
  method: 'get',
  path: '/expenses',
  tags: ['Expense'],
  summary: 'Lista as despesas do usuário autenticado',
  security: bearerSecurity,
  responses: {
    200: {
      description: 'Despesas listadas com sucesso',
      content: {
        'application/json': {
          schema: expenseListResponseSchema,
        },
      },
    },
  },
})

const getExpenseRoute = createRoute({
  method: 'get',
  path: '/expenses/{id}',
  tags: ['Expense'],
  summary: 'Busca uma despesa do usuário autenticado',
  security: bearerSecurity,
  request: {
    params: expenseIdParamSchema,
  },
  responses: {
    200: {
      description: 'Despesa encontrada com sucesso',
      content: {
        'application/json': {
          schema: expenseDetailResponseSchema,
        },
      },
    },
    404: {
      description: 'Despesa não encontrada',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
})

const updateExpenseRoute = createRoute({
  method: 'put',
  path: '/expenses/{id}',
  tags: ['Expense'],
  summary: 'Atualiza uma despesa do usuário autenticado',
  security: bearerSecurity,
  request: {
    params: expenseIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: expenseInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Despesa atualizada com sucesso',
      content: {
        'application/json': {
          schema: expenseResponseSchema,
        },
      },
    },
    404: {
      description: 'Despesa não encontrada',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
})

const deleteExpenseRoute = createRoute({
  method: 'delete',
  path: '/expenses/{id}',
  tags: ['Expense'],
  summary: 'Remove uma despesa do usuário autenticado',
  security: bearerSecurity,
  request: {
    params: expenseIdParamSchema,
  },
  responses: {
    200: {
      description: 'Despesa removida com sucesso',
      content: {
        'application/json': {
          schema: expenseDeleteResponseSchema,
        },
      },
    },
    404: {
      description: 'Despesa não encontrada',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
})

expenseRoutes.openapi(createExpenseRoute, (c) => expenseController.create(c, c.req.valid('json')))
expenseRoutes.openapi(listExpenseRoute, (c) => expenseController.list(c))
expenseRoutes.openapi(getExpenseRoute, (c) => expenseController.findById(c, c.req.valid('param')))
expenseRoutes.openapi(updateExpenseRoute, (c) =>
  expenseController.update(c, c.req.valid('param'), c.req.valid('json')))
expenseRoutes.openapi(deleteExpenseRoute, (c) => expenseController.delete(c, c.req.valid('param')))

export default expenseRoutes
