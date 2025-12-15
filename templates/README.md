# TER Template Library

Pre-built environment configuration templates for common frameworks, databases, and cloud providers.

## Database Templates

### PostgreSQL (`postgresql.json`)
PostgreSQL database connection configuration.

**Variables**:
- `DATABASE_URL` - Full connection string (required)
- `DB_HOST` - Server hostname (required)
- `DB_PORT` - Server port (default: 5432)
- `DB_USER` - Username (required)
- `DB_PASSWORD` - Password (secret, required)
- `DB_NAME` - Database name (required)
- `DB_SSL` - Enable SSL (boolean, default: false)
- `DB_POOL_SIZE` - Connection pool size (int, default: 10)

**Example**:
```bash
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=secret
DB_NAME=mydb
DB_SSL=false
DB_POOL_SIZE=10
```

### MongoDB (`mongodb.json`)
MongoDB database connection configuration.

**Variables**:
- `MONGODB_URI` - Full connection string (required)
- `MONGODB_HOST` - Server hostname (required)
- `MONGODB_PORT` - Server port (default: 27017)
- `MONGODB_USER` - Username (optional)
- `MONGODB_PASSWORD` - Password (secret, optional)
- `MONGODB_DATABASE` - Database name (required)
- `MONGODB_REPLICA_SET` - Replica set name (optional)

## Cloud Provider Templates

### AWS (`aws.json`)
Amazon Web Services credentials and configuration.

**Variables**:
- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID` - Access key (secret, required)
- `AWS_SECRET_ACCESS_KEY` - Secret key (secret, required)
- `AWS_SESSION_TOKEN` - Temporary token (secret, optional)
- `AWS_S3_BUCKET` - Default S3 bucket (optional)
- `AWS_DYNAMODB_TABLE` - Default DynamoDB table (optional)
- `AWS_SQS_QUEUE_URL` - SQS queue URL (optional)

### Google Cloud Platform (`gcp.json`)
Google Cloud Platform credentials and configuration.

**Variables**:
- `GOOGLE_PROJECT_ID` - GCP project ID (required)
- `GOOGLE_CREDENTIALS` - Service account JSON (required)
- `GCP_REGION` - Default region (default: us-central1)
- `GCLOUD_STORAGE_BUCKET` - Storage bucket name (optional)
- `GCLOUD_FIRESTORE_DATABASE` - Firestore database (optional)
- `GCLOUD_PUBSUB_TOPIC` - Pub/Sub topic (optional)
- `GCLOUD_RUN_SERVICE_URL` - Cloud Run service URL (optional)

## Framework Templates

### Express.js (`express.json`)
Express.js web server configuration.

**Variables**:
- `NODE_ENV` - Environment (development/production/test/staging)
- `PORT` - Server port (default: 3000)
- `HOST` - Server hostname (default: localhost)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `CORS_ORIGIN` - CORS origin (optional)
- `SESSION_SECRET` - Session secret (secret, required)
- `API_KEY` - API authentication key (secret, optional)
- `JWT_SECRET` - JWT signing secret (secret, optional)

### Next.js (`nextjs.json`)
Next.js full-stack configuration.

**Variables**:
- `NEXT_PUBLIC_API_URL` - Public API URL (required)
- `API_URL` - Internal API URL (required)
- `DATABASE_URL` - Database connection (required)
- `JWT_SECRET` - JWT secret (secret, required)
- `NEXTAUTH_SECRET` - NextAuth.js secret (secret, optional)
- `NEXTAUTH_URL` - NextAuth.js callback URL (optional)
- `VERCEL_URL` - Vercel deployment URL (optional)

### FastAPI (`fastapi.json`)
FastAPI Python web service configuration.

**Variables**:
- `ENVIRONMENT` - Environment (development/production/staging)
- `HOST` - Server bind address (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)
- `LOG_LEVEL` - Logging level (critical/error/warning/info/debug)
- `DATABASE_URL` - Database connection (required)
- `SECRET_KEY` - Encryption secret (secret, required)
- `JWT_ALGORITHM` - JWT algorithm (default: HS256)
- `JWT_EXPIRATION` - Token expiration in seconds (default: 3600)
- `CORS_ORIGINS` - CORS origins JSON array (optional)

## Usage

### Load a Template

```bash
# Copy template to your project
cp templates/postgresql.json .ter.json

# Edit to match your environment
ter explain DATABASE_URL
ter check --env .env
```

### Extend a Template

Combine multiple templates:

```typescript
import { Schema, Types } from 'ter';
import postgresqlTemplate from './templates/postgresql.json';
import expressTemplate from './templates/express.json';

const schema = Schema.from_dict({
  ...postgresqlTemplate,
  ...expressTemplate
});
```

## Templates Directory Structure

```
templates/
├── postgresql.json        # PostgreSQL configuration
├── mongodb.json          # MongoDB configuration
├── aws.json              # AWS credentials
├── gcp.json              # Google Cloud Platform
├── express.json          # Express.js
├── nextjs.json          # Next.js
├── fastapi.json         # FastAPI
└── README.md            # This file
```

## Adding New Templates

To contribute a new template:

1. Create a new `.json` file with the template name
2. Include all required variables for the service
3. Add sensible defaults where appropriate
4. Mark secrets with `"type": "secret"`
5. Update this README with usage examples

## Template Format

```json
{
  "name": "Service Name",
  "description": "Description of what this template configures",
  "version": "1.0",
  "variables": {
    "VAR_NAME": {
      "type": "string|number|int|boolean|enum|url|json|secret",
      "required": true|false,
      "default": "default_value",
      "description": "Human-readable description"
    }
  }
}
```

## Common Patterns

### Environment-specific Configuration

Use enum for environment selection:

```json
{
  "type": "enum",
  "values": ["development", "staging", "production"],
  "default": "development"
}
```

### Secrets Management

Mark sensitive data as secret type:

```json
{
  "type": "secret",
  "required": true,
  "description": "API key or password"
}
```

### Optional Configuration

Omit `required` or set to `false`:

```json
{
  "required": false,
  "description": "Optional feature configuration"
}
```

---

**Last Updated**: 2025-12-15  
**Total Templates**: 7  
**Coverage**: Database, Cloud, Frameworks
