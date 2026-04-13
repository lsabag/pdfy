# pdfy - PDF Platform

## Architecture
- Monorepo: Turborepo + pnpm workspaces
- `apps/web` - Next.js 16 frontend (App Router)
- `apps/api` - Express.js backend
- `packages/shared` - Shared types, validators, constants

## Development
```bash
# Start infrastructure
cd docker && docker compose up -d

# Install dependencies
pnpm install

# Push database schema
cd apps/api && pnpm db:push

# Start all services
pnpm dev
```

## Key Conventions
- API routes: `/api/{resource}` with Express
- Auth: JWT tokens stored in localStorage, sent as `Authorization: Bearer {token}`
- Storage: S3/MinIO with presigned URLs (never stream files through Express)
- Heavy PDF ops: Queued via BullMQ, never inline in request handlers
- CSS: Tailwind with Adobe-style design tokens in globals.css CSS variables
- State: Zustand stores in `apps/web/src/stores/`

## Ports
- Next.js: 3000
- Express API: 4000
- MongoDB: 27017
- Redis: 6379
- MinIO: 9000 (API), 9001 (Console)
