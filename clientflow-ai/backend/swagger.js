/**
 * PROMPT 116 — API Documentation (Swagger / OpenAPI)
 * Generates interactive API docs at /api/docs.
 * Uses swagger-jsdoc to build spec from JSDoc comments.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'ClientFlow AI API',
      version:     '1.0.0',
      description: 'Multi-tenant WhatsApp Business Automation SaaS — REST API',
      contact: {
        name:  'ClientFlow AI',
        email: 'support@clientflow.ai',
        url:   'https://clientflow.ai',
      },
    },
    servers: [
      { url: '/api/v1', description: 'Version 1 (current)' },
      { url: '/api',    description: 'Legacy (no version)' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
          description:  'JWT token obtained from POST /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error:   { type: 'string', example: 'Resource not found' },
            code:    { type: 'string', example: 'NOT_FOUND' },
            details: { type: 'object', nullable: true },
          },
        },
        Client: {
          type: 'object',
          properties: {
            id:               { type: 'string', format: 'uuid' },
            org_id:           { type: 'string', format: 'uuid' },
            whatsapp_number:  { type: 'string', example: '+923001234567' },
            name:             { type: 'string' },
            email:            { type: 'string', format: 'email' },
            status:           { type: 'string', enum: ['lead','active','paid','inactive','blocked'] },
            total_spent_pkr:  { type: 'number' },
            created_at:       { type: 'string', format: 'date-time' },
          },
        },
        Broadcast: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            org_id:          { type: 'string', format: 'uuid' },
            title:           { type: 'string' },
            message:         { type: 'string' },
            target_audience: { type: 'string', enum: ['all','paid','inactive','leads'] },
            status:          { type: 'string', enum: ['draft','scheduled','sent','failed'] },
            scheduled_at:    { type: 'string', format: 'date-time', nullable: true },
            total_sent:      { type: 'integer' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            name:            { type: 'string' },
            slug:            { type: 'string', example: 'acme-corp' },
            plan_id:         { type: 'string', format: 'uuid' },
            brand_name:      { type: 'string', nullable: true },
            custom_domain:   { type: 'string', nullable: true },
            domain_verified: { type: 'boolean' },
          },
        },
        Session: {
          type: 'object',
          properties: {
            id:             { type: 'string', format: 'uuid' },
            device_name:    { type: 'string' },
            ip_address:     { type: 'string' },
            last_active_at: { type: 'string', format: 'date-time' },
            expires_at:     { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth',        description: 'Authentication and session management' },
      { name: 'Clients',     description: 'Contact / client management' },
      { name: 'Broadcasts',  description: 'Bulk WhatsApp broadcasts' },
      { name: 'AI',          description: 'AI-powered responses and automation' },
      { name: 'Analytics',   description: 'Dashboard and reporting' },
      { name: 'Payments',    description: 'Payment tracking' },
      { name: 'Experiments', description: 'A/B testing engine' },
      { name: 'WhiteLabel',  description: 'Branding and custom domains' },
      { name: 'Sessions',    description: 'Multi-device session management' },
      { name: 'Usage',       description: 'Feature usage tracking' },
    ],
  },
  // Scan all route files for JSDoc @swagger annotations
  apis: ['./routes/**/*.js', './routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
