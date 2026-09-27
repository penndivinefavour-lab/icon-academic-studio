# Development Setup Guide

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **PostgreSQL** >= 14 (for database)
- **Git** (version control)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/penndivinefavour-lab/icon-academic-studio.git
cd icon-academic-studio
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your values:

```env
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173

DATABASE_URL="postgresql://user:password@localhost:5432/icon_academic_studio"

# AI Provider keys (optional for Phase 1)
GEMINI_API_KEY=
OPENAI_API_KEY=
```

### 4. Set Up Database

```bash
# Run migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate
```

### 5. Start Development Servers

**Terminal 1 - API:**
```bash
pnpm dev
```

**Terminal 2 - Web:**
```bash
cd apps/web && pnpm dev
```

Access the application at:
- Frontend: http://localhost:5173
- API: http://localhost:4000

---

## Available Scripts

From the root directory:

```bash
# Install all dependencies
pnpm install

# Start API in development mode
pnpm dev

# Build the API
pnpm build

# Run tests
pnpm test

# Type check all packages
pnpm typecheck

# Lint code
pnpm lint

# Database migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Generate Prisma client
pnpm db:generate
```

---

## Architecture Overview

### Monorepo Structure

This is a pnpm workspace monorepo with the following packages:

| Package | Purpose |
|---------|---------|
| `apps/api` | Express backend with TypeScript |
| `apps/web` | React frontend with Vite |
| `packages/shared` | Shared TypeScript types |
| `packages/db` | Prisma schema and client |
| `packages/ui` | Shared UI components |

### Technology Stack

- **Backend**: Express.js + TypeScript
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: PostgreSQL via Prisma ORM
- **Testing**: Vitest + Supertest
- **Package Manager**: pnpm workspaces

---

## Database Configuration

### Local PostgreSQL

Install PostgreSQL locally or use Docker:

```bash
# Using Docker
docker run --name icon-academic-db \
  -e POSTGRES_USER=icon \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=icon_academic_studio \
  -p 5432:5432 \
  -d postgres:16
```

Then update your `.env`:
```env
DATABASE_URL="postgresql://icon:password@localhost:5432/icon_academic_studio"
```

### Database Commands

```bash
# Create migration
npx prisma migrate dev --name add_feature_name

# Deploy migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open database GUI
pnpm db:studio
```

---

## Testing

### Run All Tests

```bash
pnpm test
```

### Run API Tests

```bash
cd apps/api && pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Test Coverage

```bash
pnpm test --coverage
```

---

## TypeScript

### Type Checking

```bash
pnpm typecheck
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
cd apps/api && pnpm build
```

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

### Commit Convention

Use conventional commits:

```
feat: add project CRUD endpoints
fix: resolve validation error in source creation
docs: update API documentation
test: add integration tests for projects
chore: update dependencies
```

---

## Troubleshooting

### Port Already in Use

If port 4000 or 5173 is already in use:

```bash
# Change port in .env
PORT=4001
```

### Database Connection Errors

Verify PostgreSQL is running:
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Or using Docker
docker ps | grep postgres
```

### Prisma Client Not Found

Regenerate the Prisma client:
```bash
pnpm db:generate
```

---

## Security Notes

- Never commit `.env` files
- Use strong passwords for database
- Enable HTTPS in production
- Regularly rotate API keys
- Keep dependencies updated

---

## Next Steps

After completing Phase 1:

1. Explore the [ROADMAP.md](../ROADMAP.md) for future phases
2. Review [ARCHITECTURE.md](../ARCHITECTURE.md) for system design
3. Check [SECURITY.md](../SECURITY.md) for security guidelines
