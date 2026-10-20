import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Doctor X — Healthcare Platform API',
    version: '1.0.0',
    description: 'Comprehensive, secure RESTful API specification for the Doctor X Full-Stack Healthcare Web Application.',
    contact: {
      name: 'Doctor X Engineering Team',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API base endpoint',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user account (Patient, Doctor, Clinic Admin, Platform Admin)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'user@example.com' },
                  password: { type: 'string', example: 'securePass123' },
                  name: { type: 'string', example: 'Alex Smith' },
                  role: { type: 'string', enum: ['patient', 'doctor', 'clinic_admin', 'platform_admin'], example: 'patient' },
                  phone: { type: 'string', example: '+1-555-0199' },
                },
                required: ['email', 'password', 'name'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Registration successful' },
          409: { description: 'Account already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user credentials and obtain JWT',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'doctor@doctorx.com' },
                  password: { type: 'string', example: 'DoctorX@2026' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/patients': {
      get: {
        summary: 'List patients with pagination and text search',
        tags: ['Patients'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { 200: { description: 'List of patients' } },
      },
      post: {
        summary: 'Register a new patient record',
        tags: ['Patients'],
        responses: { 201: { description: 'Patient registered' } },
      },
    },
    '/appointments': {
      get: {
        summary: 'Get filtered appointments for authenticated user',
        tags: ['Appointments'],
        responses: { 200: { description: 'List of appointments' } },
      },
      post: {
        summary: 'Book an appointment with collision prevention',
        tags: ['Appointments'],
        responses: { 201: { description: 'Appointment confirmed' }, 409: { description: 'Schedule conflict' } },
      },
    },
    '/prescriptions': {
      get: {
        summary: 'Get authorized prescriptions',
        tags: ['Prescriptions'],
        responses: { 200: { description: 'List of prescriptions' } },
      },
      post: {
        summary: 'Create and clinically approve prescription',
        tags: ['Prescriptions'],
        responses: { 201: { description: 'Prescription approved' } },
      },
    },
    '/reminders': {
      get: {
        summary: 'Get automated follow-up and appointment reminders',
        tags: ['Reminders'],
        responses: { 200: { description: 'List of reminders' } },
      },
    },
  },
};

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('[Swagger] OpenAPI Documentation mounted at /api-docs');
};
