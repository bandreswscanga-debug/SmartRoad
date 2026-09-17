const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SmartRoad S.O.S API',
      version: '1.0.0',
      description:
        'API REST del sistema de detección de somnolencia y fatiga del conductor. ' +
        'Incluye el módulo transversal: health check (/api/health) y trazabilidad ciega (system_logs).'
    },
    servers: [{ url: 'http://localhost:4000' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: [__filename]
};

const paths = {
  '/api/health': {
    get: {
      tags: ['Transversal'],
      summary: 'Health check público',
      description: 'Estado del servidor, uptime y ping a la base de datos.',
      security: [],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean' },
                  estado: { type: 'string' },
                  servicio: { type: 'string' },
                  uptime: { type: 'number' },
                  uptime_human: { type: 'string' },
                  db: {
                    type: 'object',
                    properties: {
                      conectado: { type: 'boolean' },
                      latencia_ms: { type: 'number', nullable: true },
                      motor: { type: 'string', enum: ['memory', 'mysql'] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/auth/login': {
    post: {
      tags: ['Autenticación'],
      summary: 'Iniciar sesión (JWT)',
      description: 'Intento fallido (contraseña incorrecta o usuario inexistente) queda registrado en system_logs como ERROR.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 4, maxLength: 128 }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Token JWT y datos del usuario' },
        400: { description: 'Validación de entrada' },
        401: { description: 'Credenciales inválidas' },
        429: { description: 'Demasiados intentos (rate limit)' }
      }
    }
  },
  '/api/auth/me': {
    get: {
      tags: ['Autenticación'],
      summary: 'Usuario autenticado',
      responses: { 200: { description: 'Datos del usuario' }, 401: { description: 'No autenticado' } }
    }
  },
  '/api/system/logs': {
    get: {
      tags: ['Transversal'],
      summary: 'Listar trazabilidad (system_logs)',
      description: 'Solo administradores. Lista los registros de trazabilidad ciega.',
      parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', maximum: 1000 }, description: 'Cantidad de registros (default 100)' }],
      responses: {
        200: { description: 'Registros de system_logs' },
        403: { description: 'Acceso restringido a administradores' }
      }
    }
  },
  '/api/telemetry/event': {
    post: {
      tags: ['Telemetría'],
      summary: 'Ingresar evento de telemetría (ESP32/app móvil)',
      description: 'Si el riesgo es CRITICO o tipo SOS crea una alerta activa. Los fallos de conexión a la BD se registran en system_logs.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['codigo', 'tipo'],
              properties: {
                codigo: { type: 'string', example: 'TRK-001' },
                tipo: { type: 'string', enum: ['MICRO_SUENO', 'SOMNOLENCIA_ALTA', 'FATIGA_PROLONGADA', 'DISTRACCION', 'SOS', 'ACCIDENTE'] },
                riesgo: { type: 'string', enum: ['BAJO', 'MEDIO', 'CRITICO'] },
                lat: { type: 'number' },
                lng: { type: 'number' },
                velocidad: { type: 'number' }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Evento creado y alerta (si aplica)' }, 400: { description: 'Parámetros inválidos' }, 404: { description: 'Vehículo no registrado' } }
    }
  },
  '/api/dashboard/summary': {
    get: {
      tags: ['Centro de control'],
      summary: 'Resumen del centro de control',
      responses: { 200: { description: 'Resumen' } }
    }
  }
};

options.definition.paths = paths;

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;