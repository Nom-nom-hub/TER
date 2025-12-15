/**
 * TER Reference Deployment: Express.js App
 * 
 * This demonstrates real-world usage of TER in production:
 * 1. Define configuration contract
 * 2. Validate before app starts
 * 3. Type-safe access to config
 * 4. Secret redaction
 * 5. Audit trail for compliance
 */

import express, { Express, Request, Response } from 'express';
import { Schema, Types, Environment } from 'ter';

// ============================================================================
// CONFIGURATION SCHEMA
// ============================================================================

const schema = new Schema();

// Server configuration
schema.define('NODE_ENV', Types.enum(['development', 'staging', 'production']).default('development'));
schema.define('PORT', Types.int().minimum(1).maximum(65535).default(3000));

// Database (required)
schema.define('DATABASE_URL', Types.url().markRequired());

// Cache (optional, with default)
schema.define('REDIS_URL', Types.url().default('redis://localhost:6379'));

// Security (secrets)
schema.define('API_KEY', Types.secret().markRequired());
schema.define('JWT_SECRET', Types.secret().markRequired());

// Logging
schema.define('LOG_LEVEL', Types.enum(['error', 'warn', 'info', 'debug']).default('info'));

// CORS
schema.define('CORS_ORIGIN', Types.url());

// Rate limiting
schema.define('RATE_LIMIT_MAX', Types.int().minimum(1).maximum(10000).default(100));

// ============================================================================
// INITIALIZATION
// ============================================================================

const env = new Environment(schema);

// Validate configuration before app starts
// This is the key principle: fail fast, before any real work begins
try {
  env.init();
  console.log('✅ Configuration valid');
} catch (error) {
  console.error('❌ Configuration invalid');
  console.error(error);
  process.exit(1);
}

// ============================================================================
// TYPE-SAFE CONFIGURATION ACCESS
// ============================================================================

const config = {
  env: env.getString('NODE_ENV'),
  port: env.getInt('PORT'),
  database: env.getString('DATABASE_URL'),
  redis: env.getString('REDIS_URL'),
  apiKey: env.getString('API_KEY'), // Safe - marked as secret
  jwtSecret: env.getString('JWT_SECRET'), // Safe - marked as secret
  logLevel: env.getString('LOG_LEVEL'),
  corsOrigin: env.getString('CORS_ORIGIN', { optional: true }),
  rateLimit: env.getInt('RATE_LIMIT_MAX'),
};

// ============================================================================
// APPLICATION
// ============================================================================

const app: Express = express();

// Middleware
app.use(express.json());

// CORS configuration
if (config.corsOrigin) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', config.corsOrigin);
    next();
  });
}

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${config.logLevel.toUpperCase()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

app.get('/config/schema', (req: Request, res: Response) => {
  // Expose schema for visibility (safe - no secrets revealed)
  res.json({
    schema: schema.toJSON(),
    message: 'This shows what configuration this app requires',
  });
});

app.get('/api/example', (req: Request, res: Response) => {
  res.json({
    message: 'Configuration validated and app running',
    database: config.database.substring(0, 20) + '...',
    rateLimit: config.rateLimit,
    // Note: API_KEY and JWT_SECRET are NEVER exposed in responses
  });
});

// ============================================================================
// STARTUP
// ============================================================================

const startServer = () => {
  const server = app.listen(config.port, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`TER Reference Deployment`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Environment: ${config.env}`);
    console.log(`Server: http://localhost:${config.port}`);
    console.log(`Database: ${config.database.substring(0, 30)}...`);
    console.log(`Redis: ${config.redis.substring(0, 30)}...`);
    console.log(`Log Level: ${config.logLevel}`);
    console.log(`Rate Limit: ${config.rateLimit} req/min`);
    console.log(`${'='.repeat(50)}\n`);
  });

  return server;
};

// ============================================================================
// AUDIT TRAIL (Compliance-Ready)
// ============================================================================

// This would be sent to your audit/compliance system
const auditTrail = {
  timestamp: new Date().toISOString(),
  application: 'ter-express-reference',
  version: '1.0.0',
  configurationStatus: 'valid',
  environment: config.env,
  configurationSchema: schema.toJSON(),
  // Note: Actual secret values are NEVER logged
  // Only presence/absence and validation status
};

// Log audit trail (in production, send to audit system)
console.log('Audit Trail:', JSON.stringify(auditTrail, null, 2));

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// ============================================================================
// START
// ============================================================================

const server = startServer();

export default app;
