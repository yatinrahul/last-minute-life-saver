# The Last-Minute Life Saver

An AI-powered productivity companion that helps students, professionals, and entrepreneurs plan, prioritize, and complete tasks before deadlines are missed. Powered by Google Gemini AI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/life-saver run dev` — run the frontend (port 20709)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `GEMINI_API_KEY` — Google Gemini API key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + wouter routing
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: Google Gemini (gemini-2.5-flash) via `@google/genai`
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle schema: `tasks.ts`, `goals.ts`
- `artifacts/api-server/src/routes/` — Express routes: `tasks.ts`, `goals.ts`, `ai.ts`
- `artifacts/life-saver/src/` — React frontend
- `lib/integrations-gemini-ai/` — Gemini AI client wrapper

## Architecture decisions

- Gemini AI client supports both `GEMINI_API_KEY` (user's own key) and `AI_INTEGRATIONS_GEMINI_*` (Replit proxy), with user key taking precedence.
- AI coach endpoint uses SSE streaming — client consumes via raw `fetch` + `ReadableStream`, not a generated hook (Orval can't type SSE).
- Task prioritization and breakdown use Gemini with JSON mode (`responseMimeType: "application/json"`) for reliable structured output.
- Dashboard and urgent tasks endpoints derive stats from in-memory filtering over all tasks (no complex SQL aggregations needed at this scale).

## Product

- **Dashboard** — urgency radar: overdue/due-today tasks, completion stats, quick links to AI features
- **Tasks** — full CRUD with priority/status filtering, AI task breakdown into subtasks
- **Goals** — goal tracking with progress percentage and color coding
- **AI Prioritize** — select tasks, get Gemini-powered scoring, scheduling suggestions, and tips
- **AI Coach** — streaming chat with a productivity coach persona powered by Gemini

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The `lib/integrations-gemini-ai/src/image/client.ts` and `src/client.ts` were modified to accept `GEMINI_API_KEY` directly (the template required Replit AI Integrations env vars).
- `lib/integrations-gemini-ai/src/image/index.ts` — exports only `generateImage`, not `ai` (which is `const`, not exported).
- Run `pnpm install --no-frozen-lockfile` after adding new workspace dependencies.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
