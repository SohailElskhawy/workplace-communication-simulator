# Repository Foundation Design

## Scope

Implement only Milestone 1 from `docs/DEVELOPMENT_PLAN.md`: the repository and tooling foundation required for later vertical-slice work. This milestone does not include authentication, Prisma schema or domain models, OpenAI integration, voice, scenario content, or product features.

The stale `docs/PROJECT_STATE.md` next-task note will be corrected after the milestone is verified because the required source-of-truth documents now exist and `docs/DEVELOPMENT_PLAN.md` identifies Repository Foundation as the current task.

## Repository Structure

The repository will use pnpm workspaces with these members:

```text
apps/web
apps/api
packages/contracts
```

The root will own workspace orchestration, shared TypeScript defaults, lint configuration, formatting configuration, and common scripts. A root `prisma/` directory will exist with a tracked placeholder but no Prisma schema or models.

## Web Application

`apps/web` will be a minimal Next.js App Router application using TypeScript and Tailwind CSS. It will contain only the framework shell and a simple foundation page; no product interface or authentication will be added.

Web environment configuration will be parsed through a focused Zod schema. Only public web variables may use the `NEXT_PUBLIC_` prefix. Local development will have a safe API URL default so the application can start without product credentials.

## API Application

`apps/api` will be an Express TypeScript application split into an application factory and a process entry point. The factory enables integration testing without opening a network port.

The API will expose only:

```text
GET /api/v1/health
```

It will return the approved success envelope with a shared contract:

```json
{
  "data": {
    "status": "ok"
  }
}
```

API environment configuration will use Zod validation for the runtime environment, port, and web origin. Safe local defaults will allow startup without authentication, database, or AI credentials. Invalid values will fail fast with validation errors.

## Shared Contracts

`packages/contracts` will be published within the workspace as `@kalemny/contracts`. It will export the health response Zod schema and its inferred TypeScript type. The API will import and use this schema, proving the shared package boundary works without exposing hidden configuration.

The package will remain source-focused and minimal. Product DTOs will be added only in their respective future milestones.

## TypeScript, Linting, and Formatting

All workspaces will extend a strict root TypeScript configuration. Strict mode, unchecked indexed access, exact optional property types, and safe module settings will apply consistently.

ESLint will run from the root across all TypeScript and Next.js sources. Prettier will provide a deterministic format check and write command. Generated output, framework caches, coverage, and dependencies will be ignored.

## Tests

Vitest will provide the test foundation. Initial behavioral tests will cover:

- the API health route and its shared response contract;
- API environment validation, including rejection of an invalid port;
- web environment validation, including rejection of an invalid API URL;
- the shared contract itself where needed to prove package consumption.

Behavioral production code will follow red-green TDD. Pure scaffold and configuration files are not treated as product behavior.

## Workspace Scripts

The root will expose scripts for:

```text
dev
dev:web
dev:api
build
typecheck
lint
format
format:check
test
```

Workspace-local scripts will support orchestration through pnpm filters and recursive execution.

## Verification

Milestone 1 is accepted only after fresh verification shows:

1. dependencies install successfully and the workspace lockfile exists;
2. the web development server starts locally and responds;
3. the API development server starts locally and its health endpoint responds with the shared contract;
4. `@kalemny/contracts` imports correctly from the API;
5. root typecheck passes;
6. root lint passes;
7. root tests pass;
8. the diff contains no authentication, Prisma domain models, OpenAI, voice, or product-feature implementation.

After verification, `docs/PROJECT_STATE.md` will record Milestone 1 as complete and Milestone 2 as the next task without starting Milestone 2.
