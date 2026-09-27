# Database setup

## Local Development (SQLite)

The application uses SQLite for local development, making it fully functional without external database dependencies.

```bash
# Copy environment
cp .env.example .env

# The DATABASE_URL defaults to:
DATABASE_URL="file:./dev.db"

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate
```

## Production (PostgreSQL)

For production deployment, update `.env`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/icon_academic_studio"
```

Then run migrations:
```bash
pnpm db:migrate
```

## Storage Location

Uploaded files are stored in `./storage/uploads/` (outside the repository). This directory is gitignored.
