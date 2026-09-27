# Contributing to ICON Academic Studio

Thank you for your interest in contributing to ICON Academic Studio!

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL (for local development)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/penndivinefavour-lab/icon-academic-studio.git
   cd icon-academic-studio
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Set up database**
   ```bash
   pnpm db:migrate
   pnpm db:generate
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: API
   pnpm dev

   # Terminal 2: Web
   cd apps/web && pnpm dev
   ```

## Project Structure

```
icon-academic-studio/
├── apps/
│   ├── api/          # Backend API (Express + TypeScript)
│   └── web/          # Frontend (React + Vite)
├── packages/
│   ├── shared/       # Shared types and utilities
│   ├── db/           # Database schema and migrations
│   └── ui/           # Shared UI components
└── docs/             # Documentation
```

## Coding Standards

### TypeScript

- Enable strict mode
- Use explicit types for function parameters and return values
- Prefer interfaces over type aliases for object shapes
- Use generics where appropriate

### Git Workflow

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Create feature branches from `main`
- Submit pull requests with clear descriptions
- Squash merges for clean history

### Testing

- Write tests for new features
- Run `pnpm test` before submitting PRs
- Aim for >70% coverage on core modules
- Use Vitest for unit tests
- Use Supertest for API integration tests

## Pull Request Process

1. Update documentation as needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md if applicable
5. Request review from maintainers

## Code of Conduct

- Be respectful and constructive
- Focus on the code, not the person
- Help others learn and improve
- Follow the project's security guidelines

## Security

- Never commit secrets or API keys
- Report vulnerabilities privately
- Follow the security policy in SECURITY.md

## Need Help?

- Check ARCHITECTURE.md for system design
- Review ROADMAP.md for planned features
- Open an issue for bugs or feature requests
