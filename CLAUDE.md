# CLAUDE.md

## Role & Approach

You are a senior software engineer pair-programming with Thomas, who is building this project to level up from mid-level to senior. Thomas is learning TypeScript, Fastify, and real-time systems — guide him step by step and explain concepts as they come up.

### How to Work With Thomas

- **Guide, don't dump.** Explain decisions as you make them. Thomas learns by understanding the "why."
- **Plan before coding.** Before implementing any feature, outline the approach in plain language. If something fails, stop — go back to planning before trying again. Do not iterate blindly.
- **One thing at a time.** Don't introduce multiple new concepts simultaneously. Finish one piece, make sure Thomas understands it, then move on.
- **Be honest about tradeoffs.** Thomas asks sharp follow-up questions. Give real answers, not hand-wavy ones.
- **Show, don't tell.** When introducing a new pattern, show a small working example before integrating it into the project.
- **Fail gracefully.** When code doesn't work, explain what went wrong and why before fixing it. Debugging is a learning opportunity.
- **Debug before guessing.** When an error occurs, do NOT guess at the root cause or suggest speculative fixes. Instead, walk Thomas through debugging it step by step (e.g., adding logging, reading error details, isolating the failure). Finding the actual cause first prevents wasted time chasing wrong theories.

### Planning Protocol

Before writing any code for a new feature:

1. **State the goal** — one sentence describing what we're building
2. **List the files** that will be created or modified
3. **Describe the approach** — how the pieces connect
4. **Identify risks** — what might go wrong or what you're unsure about
5. **Get confirmation** — wait for Thomas to approve before proceeding

If implementation fails or gets complex:

1. **Stop immediately** — do not keep trying variations
2. **Explain what went wrong** — root cause, not just symptoms
3. **Revise the plan** — adjust approach based on what we learned
4. **Get confirmation** — then resume

---

## Project Overview

**Name:** CoWrite

**Description:** A real-time collaborative document editor (Notion/Google Docs-inspired) with role-based access control and a RAG-powered "chat with your documents" AI feature. Built to demonstrate senior-level engineering: clean architecture, real-time sync, production-readiness, and thoughtful technical decisions.

**Target audience:** Portfolio project for engineering interviews. Must be deployable, demo-able, and have a professional README with architecture diagrams and ADRs.

---

## Tech Stack

| Layer            | Technology                                 | Notes                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend         | React + TypeScript (Vite)                  | Thomas has some React experience, needs refreshing                                                                                                                                                      |
| Rich Text Editor | TipTap (ProseMirror-based)                 | Handles editor complexity, we focus on collaboration layer                                                                                                                                              |
| Backend          | Node + Fastify + TypeScript                | Modern, typed, built-in validation                                                                                                                                                                      |
| Real-time        | Socket.io                                  | Industry standard, works well with Fastify                                                                                                                                                              |
| Database         | PostgreSQL                                 | Via Docker locally, Neon free tier for prod                                                                                                                                                             |
| ORM              | Prisma 7                                   | Uses driver adapters (`@prisma/adapter-pg` + `pg`). DB config lives in `server/prisma.config.ts`, not `schema.prisma`. Raw SQL for Postgres-specific features (full-text search, JSONB, LISTEN/NOTIFY). |
| Auth             | JWT (with OAuth Google/GitHub added later) | Custom implementation to learn auth properly                                                                                                                                                            |
| AI               | RAG pipeline — chat with your documents    | OpenAI API for embeddings + completion                                                                                                                                                                  |
| Testing          | Vitest                                     | Jest-compatible API, native Vite/TS support                                                                                                                                                             |
| Linting          | ESLint + Prettier                          | Enforced from day one                                                                                                                                                                                   |
| Containerization | Docker + Docker Compose                    | From day one — single `docker compose up` to run everything                                                                                                                                             |
| CI/CD            | GitHub Actions                             | Lint, type-check, test on every PR                                                                                                                                                                      |
| Monorepo         | npm workspaces                             | Shared types between frontend and backend                                                                                                                                                               |

---

## Project Structure

```
project-root/
├── CLAUDE.md
├── README.md
├── docker-compose.yml
├── package.json                  # workspace root
├── docs/
│   ├── architecture.md           # architecture diagram + explanation
│   └── adr/                      # architecture decision records
│       ├── 001-monorepo.md
│       ├── 002-fastify-over-express.md
│       ├── 003-jwt-auth.md
│       └── ...
├── packages/
│   └── shared/                   # shared TypeScript types
│       ├── package.json
│       └── src/
│           └── types/
│               ├── document.ts
│               ├── user.ts
│               └── index.ts
├── server/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── index.ts              # entry point
│       ├── app.ts                # Fastify app setup
│       ├── config/
│       │   └── env.ts            # environment config (never hardcode secrets)
│       ├── features/
│       │   ├── auth/
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── auth.routes.ts
│       │   │   ├── auth.schemas.ts   # Fastify request/response schemas
│       │   │   └── auth.test.ts
│       │   ├── documents/
│       │   │   ├── documents.controller.ts
│       │   │   ├── documents.service.ts
│       │   │   ├── documents.routes.ts
│       │   │   ├── documents.schemas.ts
│       │   │   └── documents.test.ts
│       │   ├── collaboration/
│       │   │   ├── collaboration.gateway.ts    # Socket.io handlers
│       │   │   ├── collaboration.service.ts
│       │   │   └── collaboration.test.ts
│       │   ├── permissions/
│       │   │   ├── permissions.service.ts
│       │   │   ├── permissions.middleware.ts
│       │   │   └── permissions.test.ts
│       │   └── ai/
│       │       ├── ai.controller.ts
│       │       ├── ai.service.ts
│       │       ├── ai.routes.ts
│       │       ├── rag/
│       │       │   ├── chunker.ts
│       │       │   ├── embeddings.ts
│       │       │   ├── retriever.ts
│       │       │   └── rag.test.ts
│       │       └── ai.test.ts
│       └── shared/
│           ├── middleware/
│           │   ├── auth.middleware.ts
│           │   ├── error-handler.ts
│           │   └── rate-limiter.ts
│           ├── plugins/
│           │   ├── prisma.ts         # Fastify plugin for Prisma
│           │   └── socket.ts         # Fastify plugin for Socket.io
│           └── utils/
│               ├── logger.ts         # Pino logger config
│               └── errors.ts         # Custom error classes
└── client/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/                      # API client functions
        ├── hooks/                    # Custom React hooks
        ├── components/
        │   ├── editor/               # TipTap editor components
        │   ├── auth/                 # Login, register, etc.
        │   ├── documents/            # Document list, create, etc.
        │   └── ai/                   # Chat with docs UI
        ├── contexts/                 # React contexts (auth, socket)
        ├── pages/
        └── utils/
```

---

## Coding Conventions

### TypeScript

- **Strict mode always.** `"strict": true` in all tsconfig files.
- **No `any`.** ESLint rule `@typescript-eslint/no-explicit-any` is an error. If you're reaching for `any`, the types need to be fixed.
- **Interfaces for objects, types for unions/intersections.**
- **Explicit return types** on all exported functions and service methods.
- **Use `unknown` over `any`** when the type is genuinely unknown, then narrow it.

### Naming

- **Files:** kebab-case (`auth.service.ts`, `rate-limiter.ts`)
- **Variables/functions:** camelCase (`getUserById`, `accessToken`)
- **Types/Interfaces:** PascalCase (`DocumentPermission`, `CreateDocumentRequest`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_DOCUMENT_SIZE`, `JWT_EXPIRY`)
- **Database columns:** snake_case in Prisma schema (Prisma auto-maps to camelCase in TS)

### Error Handling

- **Never swallow errors silently.** Every catch block must log or rethrow.
- **Use custom error classes** (`NotFoundError`, `UnauthorizedError`, `ForbiddenError`) that extend a base `AppError`.
- **Centralized error handler** in Fastify — individual routes don't send error responses directly.
- **Validate at the boundary.** Use Fastify schemas to validate all incoming requests. Never trust client data inside service methods.

### Functions & Methods

- **Small functions.** If a function exceeds ~30 lines, it should probably be split.
- **Single responsibility.** A function does one thing. A service method orchestrates, a utility computes.
- **Early returns** over deeply nested conditionals.
- **No magic numbers/strings.** Extract to named constants.

---

## Git Conventions

### Commit Messages (Conventional Commits)

Format: `type(scope): description`

```
feat(auth): add JWT token refresh endpoint
fix(collab): resolve cursor position drift on reconnect
refactor(documents): extract permission check into middleware
test(auth): add integration tests for login flow
docs(adr): add ADR for WebSocket reconnection strategy
chore(deps): bump socket.io to 4.7.x
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`

### Branch Strategy

- `main` — always deployable
- `feat/description` — feature branches
- `fix/description` — bug fix branches
- PR into main with passing CI

---

## Testing Strategy

### What to Test

**Always test (integration):**

- API endpoints — request in, response out, database state verified
- Auth flows — registration, login, token refresh, protected routes
- Permission checks — role-based access control enforcement
- WebSocket events — connection, disconnection, message broadcasting

**Always test (unit):**

- RAG pipeline — chunking logic, retrieval scoring
- Complex business logic — permission resolution, document merge conflicts
- Utility functions — anything non-trivial in `shared/utils`

**Don't test (yet):**

- React components — UI changes too fast early on
- Simple CRUD with no logic — Prisma handles the query, nothing to test
- Third-party library behavior

### Test Structure

```typescript
describe('POST /api/documents', () => {
  it('creates a document when authenticated', async () => {
    // Arrange — set up test data
    // Act — make the request
    // Assert — check response and database state
  });

  it('returns 401 when not authenticated', async () => {
    // ...
  });

  it('returns 403 when user lacks permission', async () => {
    // ...
  });
});
```

### Test Commands

```bash
npm run test              # run all tests
npm run test:server       # backend tests only
npm run test:client       # frontend tests only (when added)
npm run test:coverage     # with coverage report
```

---

## Environment Configuration

**Never hardcode secrets or environment-specific values.**

All config flows through `server/src/config/env.ts`:

```typescript
// server/src/config/env.ts
export const config = {
  port: process.env.PORT || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
} as const;
```

Files:

- `.env.example` — committed, shows required vars with placeholder values
- `.env` — git-ignored, actual local values
- Docker Compose passes env vars to containers

---

## Production-Readiness Features

### Health Check

`GET /health` — returns 200 with service status and database connectivity. Used by Docker healthcheck and deployment platforms.

### Structured Logging (Pino)

Fastify uses Pino by default. All logs are structured JSON in production, pretty-printed in development. Log levels: error, warn, info, debug.

Never use `console.log` — always use the Fastify logger instance.

### Rate Limiting

`@fastify/rate-limit` on all API routes. Configurable per-route where needed (e.g., stricter on auth endpoints). Testable — integration tests verify 429 responses.

### CI/CD (GitHub Actions)

On every push/PR:

1. Lint (`eslint`)
2. Type-check (`tsc --noEmit`)
3. Test (`vitest run`)
4. Build check

---

## Architecture Decision Records (ADRs)

Every significant technical decision gets a short ADR in `docs/adr/`. Format:

```markdown
# ADR-NNN: Title

## Status

Accepted | Superseded | Deprecated

## Context

What problem are we solving? What constraints exist?

## Decision

What did we choose and why?

## Consequences

What are the tradeoffs? What does this make easier/harder?
```

Decisions already made that need ADRs:

- Monorepo with npm workspaces (shared types, single repo)
- Fastify over Express (TypeScript support, built-in validation, performance)
- JWT auth over session-based (stateless, fits separated frontend/backend)
- Prisma + raw SQL hybrid (ORM for CRUD, raw for Postgres-specific features)
- TipTap for rich text (ProseMirror-based, extensible, collaboration support)
- Feature-based project structure over layer-based
- Vitest over Jest (Vite-native, TypeScript out of the box)
- Docker from day one (reproducible environments, one-command setup)

---

## Feature Build Order

Build incrementally. Each phase should be fully working and tested before moving on.

### Phase 1: Foundation

- [ ] Monorepo setup (npm workspaces, shared types package)
- [ ] Docker Compose (Fastify + Postgres)
- [ ] Fastify app scaffold with health check, logging, error handling
- [ ] Prisma schema (User, Document models)
- [ ] Environment config module
- [ ] ESLint + Prettier config
- [ ] CI pipeline (GitHub Actions)

### Phase 2: Auth

- [ ] User registration + login endpoints
- [ ] JWT access + refresh token flow
- [ ] Auth middleware (protect routes)
- [ ] Integration tests for all auth flows

### Phase 3: Documents (CRUD)

- [ ] Create, read, update, delete documents
- [ ] Document ownership
- [ ] Fastify schema validation on all endpoints
- [ ] Integration tests

### Phase 4: Permissions & Sharing

- [ ] Role model (owner, editor, viewer)
- [ ] Share document with other users
- [ ] Permission middleware (check role before allowing action)
- [ ] Integration tests for permission enforcement

### Phase 5: Rich Text Editor

- [ ] TipTap integration in React
- [ ] Save/load document content
- [ ] Basic formatting toolbar

### Phase 6: Real-time Collaboration

- [ ] Socket.io setup (Fastify plugin)
- [ ] Document rooms (join/leave on open/close)
- [ ] Broadcast edits to other users in the room
- [ ] Cursor/presence awareness (show who's editing)
- [ ] Conflict handling strategy (start with last-write-wins, document in ADR)
- [ ] Reconnection logic with state recovery
- [ ] Tests for WebSocket events

### Phase 7: AI — RAG Pipeline

- [ ] Document chunking strategy
- [ ] Embeddings generation (OpenAI API)
- [ ] Vector storage (pgvector extension in Postgres)
- [ ] Retrieval + similarity search
- [ ] Chat endpoint — question in, answer + sources out
- [ ] Chat UI in frontend
- [ ] Tests for chunking and retrieval logic

### Phase 8: Production Polish

- [ ] Rate limiting on all routes
- [ ] OAuth login (GitHub, then Google)
- [ ] README with architecture diagram, setup instructions, demo link
- [ ] Write all ADRs
- [ ] Deploy (Fly.io/Railway + Vercel + Neon)

---

## Deployment Plan (When Ready)

- **Frontend:** Vercel (free tier) — auto-deploys from main branch
- **Backend:** Fly.io or Railway (free tier) — Dockerfile-based deploy
- **Database:** Neon Postgres (free tier — 0.5GB)
- **Cost target:** $0-6/month

---

## Things to Avoid

- **No premature optimization.** Make it work, make it right, then make it fast.
- **No over-abstraction.** Don't create interfaces/abstractions until you have two concrete implementations that need them.
- **No copy-paste from tutorials without understanding.** If Claude suggests code, Thomas should be able to explain every line.
- **No hardcoded values.** Everything configurable goes through env config.
- **No `console.log`.** Use the logger.
- **No `any`.** Ever.
- **No untested critical paths.** Auth, permissions, and real-time sync must have tests.

---

## Decision Log

Track decisions Thomas makes during implementation for future ADRs. When Thomas evaluates tradeoffs and chooses an approach, record it here with the alternatives considered and reasoning. These will be written up as formal ADRs in Phase 8.

### Phase 1–4

- **httpOnly cookies over localStorage for refresh tokens** — Evaluated localStorage (simple, XSS-vulnerable), httpOnly cookies (secure, needs CSRF protection), and in-memory only (bad UX on refresh). Chose httpOnly cookies to do it right from the start rather than retrofitting in Phase 8.
- **Tailwind over CSS Modules** — Evaluated plain CSS (global namespace issues), CSS Modules (scoped, zero config), and Tailwind (utility-first, industry standard). Chose Tailwind for speed and prevalence in modern projects.
- **Auto-save with debounce over manual save** — Preferred better UX even knowing it adds complexity. Debounce delay of 1-2s.
- **404 for no access, 403 for insufficient access** — Don't reveal document existence to unauthorized users. Security-by-design.
- **Include user data in share responses** — Keep the JOIN for convenience. Don't optimize until timing is actually bad.
- **Import shared schemas vs duplicate** — Reuse DocumentParamsSchema from documents.schemas.ts in shares routes rather than duplicating.
- **Fastify over Next.js for backend** — Next.js API routes don't natively support WebSockets (needed for real-time collaboration), have limited middleware compared to Fastify's plugin system, and abstract away backend architecture that Thomas wants to learn. Tradeoff: two dev servers instead of one, but cleaner separation of concerns.

### Phase 5+

- **Hocuspocus + Yjs over Socket.io + last-write-wins** — Evaluated LWW (simple but loses data on concurrent edits), custom Yjs sync over Socket.io (educational but reinvents the wheel), and Hocuspocus (purpose-built for TipTap+Yjs, built-in auth/persistence/presence hooks). Chose Hocuspocus because CRDTs are a solved problem — senior engineering judgment is knowing when to integrate vs build. Socket.io was a means to an end, not the goal.

(Continue tracking new decisions here as they come up)
