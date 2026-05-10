const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const swaggerUi = require('swagger-ui-express')
const swaggerJSDoc = require('swagger-jsdoc')

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'lab7-demo-secret-change-me'
const TOKEN_EXPIRATION = '1m'

const ROLE_PERMISSIONS = {
  ADMIN: ['READ', 'WRITE', 'DELETE'],
  WRITER: ['READ', 'WRITE'],
  VISITOR: ['READ']
}
const VALID_PERMISSIONS = ['READ', 'WRITE', 'DELETE']

let recipes = []
let nextId = 1

app.use(cors())
app.use(express.json())

function parsePermissions(input) {
  if (!input) return []

  if (Array.isArray(input)) {
    return [...new Set(input.map((permission) => String(permission).trim().toUpperCase()).filter(Boolean))]
  }

  return [...new Set(String(input)
    .split(',')
    .map((permission) => permission.trim().toUpperCase())
    .filter(Boolean))]
}

function normalizeRole(input) {
  if (input === undefined || input === null || String(input).trim() === '') {
    return null
  }
  const role = String(input).trim().toUpperCase()
  return ROLE_PERMISSIONS[role] ? role : null
}

function resolvePermissions(role, requestedPermissions) {
  const cleanRequested = requestedPermissions.filter((permission) => VALID_PERMISSIONS.includes(permission))
  const maxPermissions = role ? ROLE_PERMISSIONS[role] : VALID_PERMISSIONS
  const permissions = cleanRequested.length > 0
    ? cleanRequested.filter((permission) => maxPermissions.includes(permission))
    : maxPermissions

  return {
    permissions,
    ignoredPermissions: cleanRequested.filter((permission) => !permissions.includes(permission))
  }
}

function buildTokenPayload(role, permissions) {
  return {
    role,
    permissions
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    return next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    const permissions = req.user?.permissions || []
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: `Missing required permission: ${permission}` })
    }
    return next()
  }
}

function validatePagination(limitRaw, offsetRaw) {
  const limit = Number.parseInt(limitRaw || '10', 10)
  const offset = Number.parseInt(offsetRaw || '0', 10)

  if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0 || limit > 1000) {
    return { error: 'Invalid pagination params. Use limit >= 1, offset >= 0, limit <= 1000.' }
  }

  return { limit, offset }
}

function sanitizeRecipeInput(body) {
  const title = String(body.title || '').trim()
  const steps = String(body.steps || '')
  const tags = Array.isArray(body.tags) ? body.tags.map((tag) => String(tag).trim()).filter(Boolean) : []
  const prepTime = String(body.prepTime || '')
  const cookTime = String(body.cookTime || '')
  const servings = String(body.servings || '')
  const notes = String(body.notes || '')
  const liked = Boolean(body.liked)
  const ingredients = Array.isArray(body.ingredients)
    ? body.ingredients
      .map((item) => ({
        name: String(item?.name || '').trim(),
        amount: String(item?.amount || '').trim(),
        image: String(item?.image || '')
      }))
      .filter((item) => item.name)
    : []

  if (!title) {
    return { error: 'title is required' }
  }

  return {
    title,
    steps,
    tags,
    prepTime,
    cookTime,
    servings,
    notes,
    liked,
    ingredients
  }
}

app.get('/', (req, res) => {
  res.json({ message: 'Lab 7 Recipe API is running. Visit /docs for Swagger UI.' })
})

app.post('/token', (req, res) => {
  const requestedRole = normalizeRole(req.body.role)
  const requestedPermissions = parsePermissions(req.body.permissions)
  const role = requestedRole || (requestedPermissions.length === 0 ? 'VISITOR' : null)
  const { permissions, ignoredPermissions } = resolvePermissions(role, requestedPermissions)

  if (req.body.role !== undefined && !requestedRole) {
    return res.status(400).json({ error: 'role must be one of ADMIN, WRITER, VISITOR' })
  }

  if (permissions.length === 0) {
    return res.status(400).json({ error: 'No valid permissions available for this role' })
  }

  const tokenRole = role || 'CUSTOM'
  const token = jwt.sign(buildTokenPayload(tokenRole, permissions), JWT_SECRET, { expiresIn: TOKEN_EXPIRATION })

  return res.status(200).json({
    token,
    expiresIn: TOKEN_EXPIRATION,
    role: tokenRole,
    permissions,
    ignoredPermissions
  })
})

app.get('/token', (req, res) => {
  const requestedRole = normalizeRole(req.query.role)
  const requestedPermissions = parsePermissions(req.query.permissions)
  const role = requestedRole || (requestedPermissions.length === 0 ? 'VISITOR' : null)
  const { permissions, ignoredPermissions } = resolvePermissions(role, requestedPermissions)

  if (req.query.role !== undefined && !requestedRole) {
    return res.status(400).json({ error: 'role must be one of ADMIN, WRITER, VISITOR' })
  }

  if (permissions.length === 0) {
    return res.status(400).json({ error: 'No valid permissions available for this role' })
  }

  const tokenRole = role || 'CUSTOM'
  const token = jwt.sign(buildTokenPayload(tokenRole, permissions), JWT_SECRET, { expiresIn: TOKEN_EXPIRATION })

  return res.status(200).json({
    token,
    expiresIn: TOKEN_EXPIRATION,
    role: tokenRole,
    permissions,
    ignoredPermissions
  })
})

app.get('/api/recipes', authMiddleware, requirePermission('READ'), (req, res) => {
  const pagination = validatePagination(req.query.limit, req.query.offset)
  if (pagination.error) {
    return res.status(400).json({ error: pagination.error })
  }

  const { limit, offset } = pagination
  const items = recipes.slice(offset, offset + limit)

  return res.status(200).json({
    data: items,
    pagination: {
      total: recipes.length,
      limit,
      offset,
      hasMore: offset + limit < recipes.length
    }
  })
})

app.get('/api/recipes/:id', authMiddleware, requirePermission('READ'), (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  const recipe = recipes.find((item) => item.id === id)

  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }

  return res.status(200).json(recipe)
})

app.post('/api/recipes', authMiddleware, requirePermission('WRITE'), (req, res) => {
  const payload = sanitizeRecipeInput(req.body)
  if (payload.error) {
    return res.status(400).json({ error: payload.error })
  }

  const newRecipe = {
    id: nextId,
    ...payload
  }

  nextId += 1
  recipes.unshift(newRecipe)

  return res.status(201).json(newRecipe)
})

app.put('/api/recipes/:id', authMiddleware, requirePermission('WRITE'), (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  const index = recipes.findIndex((item) => item.id === id)

  if (index === -1) {
    return res.status(404).json({ error: 'Recipe not found' })
  }

  const payload = sanitizeRecipeInput(req.body)
  if (payload.error) {
    return res.status(400).json({ error: payload.error })
  }

  const updatedRecipe = {
    id,
    ...payload
  }

  recipes[index] = updatedRecipe
  return res.status(200).json(updatedRecipe)
})

app.delete('/api/recipes/:id', authMiddleware, requirePermission('DELETE'), (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  const index = recipes.findIndex((item) => item.id === id)

  if (index === -1) {
    return res.status(404).json({ error: 'Recipe not found' })
  }

  recipes.splice(index, 1)
  return res.status(204).send()
})

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lab 7 Recipe CRUD API',
      version: '1.0.0',
      description: 'JWT-protected CRUD API with role/permission authorization and pagination.'
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        TokenRequest: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              enum: ['ADMIN', 'WRITER', 'VISITOR']
            },
            permissions: {
              oneOf: [
                { type: 'string', example: 'READ,WRITE' },
                {
                  type: 'array',
                  items: { type: 'string', example: 'READ' }
                }
              ]
            }
          }
        },
        Recipe: {
          type: 'object',
          required: ['title'],
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Pasta Carbonara' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Egg' },
                  amount: { type: 'string', example: '2' },
                  image: { type: 'string', example: '🥚' }
                }
              }
            },
            steps: { type: 'string' },
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            prepTime: { type: 'string' },
            cookTime: { type: 'string' },
            servings: { type: 'string' },
            notes: { type: 'string' },
            liked: { type: 'boolean' }
          }
        }
      }
    },
    paths: {
      '/token': {
        get: {
          summary: 'Generate JWT token from query params',
          parameters: [
            {
              name: 'role',
              in: 'query',
              schema: { type: 'string', enum: ['ADMIN', 'WRITER', 'VISITOR'] }
            },
            {
              name: 'permissions',
              in: 'query',
              schema: { type: 'string', example: 'READ,WRITE' }
            }
          ],
          responses: {
            200: { description: 'Token generated' }
          }
        },
        post: {
          summary: 'Generate JWT token from JSON body',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenRequest' }
              }
            }
          },
          responses: {
            200: { description: 'Token generated' }
          }
        }
      },
      '/api/recipes': {
        get: {
          summary: 'List recipes with pagination',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 10 }
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', default: 0 }
            }
          ],
          responses: {
            200: { description: 'Recipes list' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' }
          }
        },
        post: {
          summary: 'Create recipe',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Recipe' }
              }
            }
          },
          responses: {
            201: { description: 'Created' },
            400: { description: 'Bad request' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' }
          }
        }
      },
      '/api/recipes/{id}': {
        get: {
          summary: 'Get recipe by id',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            200: { description: 'Recipe' },
            404: { description: 'Not found' }
          }
        },
        put: {
          summary: 'Update recipe by id',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Recipe' }
              }
            }
          },
          responses: {
            200: { description: 'Updated' },
            404: { description: 'Not found' }
          }
        },
        delete: {
          summary: 'Delete recipe by id',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            204: { description: 'Deleted' },
            404: { description: 'Not found' }
          }
        }
      }
    }
  },
  apis: []
})

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use((req, res) => {
  return res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
  console.log(`Swagger UI available on http://localhost:${PORT}/docs`)
})
