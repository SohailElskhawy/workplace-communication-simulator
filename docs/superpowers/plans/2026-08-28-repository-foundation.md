# Repository Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the minimal pnpm monorepo foundation required by Milestone 1.

**Architecture:** A root pnpm workspace orchestrates a Next.js web app, an Express API, and a buildable shared Zod contracts package. Strict TypeScript, flat ESLint configuration, Prettier, and Vitest are centralized; app-specific runtime configuration stays inside each app.

**Tech Stack:** pnpm 11.23.0, Node.js 24, Next.js 16, React 19, Tailwind CSS 4, Express 5, TypeScript, Zod 4, ESLint 10, Prettier, Vitest 4, Supertest

**Spec:** `docs/superpowers/specs/2026-08-28-repository-foundation-design.md`

## Global Constraints

- Implement only Milestone 1 from `docs/DEVELOPMENT_PLAN.md`.
- Do not implement authentication, Prisma schema/domain models, OpenAI integration, voice, scenarios, or product UI.
- Use pnpm workspaces with `apps/web`, `apps/api`, and `packages/contracts`.
- Keep browser-safe contracts separate from backend-only configuration.
- Use strict TypeScript and Zod validation for runtime environment input.
- Use `/api/v1` for API routes and `{ "data": {} }` for successful JSON responses.
- Run typecheck, lint, tests, build, and local startup smoke checks before completion.
- Preserve the unrelated untracked `.serena/` directory.

---

### Task 1: Root Workspace and Tooling

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.gitignore`
- Create: `prisma/README.md`

**Interfaces:**
- Consumes: the repository layout approved in `docs/ARCHITECTURE.md`.
- Produces: root `dev`, `dev:web`, `dev:api`, `build`, `typecheck`, `lint`, `format`, `format:check`, and `test` commands.

- [ ] **Step 1: Create the pnpm workspace manifest and root scripts**

Use a private ESM root package pinned to `pnpm@11.23.0`. Define `apps/*` and `packages/*` in `pnpm-workspace.yaml`. Root commands must use workspace filters or recursive execution; `dev` runs web and API in parallel, and `test` runs Vitest once.

- [ ] **Step 2: Create strict shared TypeScript settings**

Set `target` to `ES2022`, enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `isolatedModules`, `esModuleInterop`, `resolveJsonModule`, and `skipLibCheck`.

- [ ] **Step 3: Create centralized lint, format, and test configuration**

Use ESLint flat config with `@eslint/js`, `typescript-eslint`, Node globals for API/config files, and scoped `eslint-config-next/core-web-vitals` plus `eslint-config-next/typescript` for `apps/web`. Ignore dependencies, build output, `.next`, coverage, and `.serena`.

Configure Vitest with Node as the default environment, `**/*.test.ts` inclusion, coverage/build exclusions, and a test-only alias from `@kalemny/contracts` to `packages/contracts/src/index.ts`.

- [ ] **Step 4: Track the empty Prisma boundary without a schema**

Create `prisma/README.md` stating that schema and migrations begin in Milestone 2. Do not install Prisma.

- [ ] **Step 5: Activate pnpm and install workspace dependencies after manifests exist**

Run:

```powershell
corepack prepare pnpm@11.23.0 --activate
corepack pnpm install
```

Expected: `pnpm-lock.yaml` is created and all workspace dependencies resolve.

### Task 2: Shared Health Contract

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/tsconfig.build.json`
- Create: `packages/contracts/src/health.test.ts`
- Create: `packages/contracts/src/health.ts`
- Create: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: Zod 4 and the API success-envelope rule.
- Produces: `HealthResponseSchema` and `HealthResponse` from `@kalemny/contracts`.

- [ ] **Step 1: Add the contracts package manifest and TypeScript configs**

Name the package `@kalemny/contracts`, set it private and ESM, export types from `src/index.ts` and runtime JavaScript from `dist/index.js`, and build declarations plus JavaScript into `dist` with `tsc`.

- [ ] **Step 2: Write the failing health contract test**

```typescript
import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./health.js";

describe("HealthResponseSchema", () => {
  it("accepts the API health success envelope", () => {
    expect(
      HealthResponseSchema.parse({ data: { status: "ok" } }),
    ).toEqual({ data: { status: "ok" } });
  });

  it("rejects an unsupported health status", () => {
    expect(
      HealthResponseSchema.safeParse({ data: { status: "degraded" } }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 3: Run the contract test and verify RED**

Run: `corepack pnpm test packages/contracts/src/health.test.ts`

Expected: FAIL because `./health.js` does not exist.

- [ ] **Step 4: Implement the minimal shared schema and export**

```typescript
import { z } from "zod";

export const HealthResponseSchema = z.object({
  data: z.object({ status: z.literal("ok") }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
```

Export the schema and type from `src/index.ts`.

- [ ] **Step 5: Run the focused test and contracts build**

Run:

```powershell
corepack pnpm test packages/contracts/src/health.test.ts
corepack pnpm --filter @kalemny/contracts build
```

Expected: both commands exit 0 and `packages/contracts/dist` is generated.

### Task 3: API Environment and Health Endpoint

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/src/config/env.test.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/app.test.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`

**Interfaces:**
- Consumes: `HealthResponseSchema` and `HealthResponse` from `@kalemny/contracts`.
- Produces: `parseApiEnv(input)`, `apiEnv`, `createApp()`, and `GET /api/v1/health`.

- [ ] **Step 1: Add the API package manifest and TypeScript configs**

Use Express 5, Zod 4, and the workspace contracts package. Use `tsx watch` for development, `tsc` for build/typecheck, Vitest through the root test command, and Supertest for HTTP integration tests. Keep the application factory independent from `listen()`.

- [ ] **Step 2: Write failing API environment tests**

```typescript
import { describe, expect, it } from "vitest";
import { parseApiEnv } from "./env.js";

describe("parseApiEnv", () => {
  it("provides safe local defaults", () => {
    expect(parseApiEnv({})).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
    });
  });

  it("rejects a port outside the TCP range", () => {
    expect(() => parseApiEnv({ PORT: "70000" })).toThrow();
  });
});
```

- [ ] **Step 3: Run the environment test and verify RED**

Run: `corepack pnpm test apps/api/src/config/env.test.ts`

Expected: FAIL because `./env.js` does not exist.

- [ ] **Step 4: Implement minimal API environment parsing**

Use a Zod object with `NODE_ENV` defaulting to `development`, `PORT` coerced to an integer from 1 through 65535 with default 4000, and `WEB_ORIGIN` validated as an HTTP(S) URL with default `http://localhost:3000`. Export both `parseApiEnv` and the parsed `apiEnv`.

- [ ] **Step 5: Run the environment test and verify GREEN**

Run: `corepack pnpm test apps/api/src/config/env.test.ts`

Expected: 2 tests pass.

- [ ] **Step 6: Write the failing API health integration test**

```typescript
import request from "supertest";
import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "@kalemny/contracts";
import { createApp } from "./app.js";

describe("GET /api/v1/health", () => {
  it("returns the shared health response", async () => {
    const response = await request(createApp()).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(HealthResponseSchema.parse(response.body)).toEqual({
      data: { status: "ok" },
    });
  });
});
```

- [ ] **Step 7: Run the health test and verify RED**

Run: `corepack pnpm test apps/api/src/app.test.ts`

Expected: FAIL because `./app.js` does not exist.

- [ ] **Step 8: Implement the application factory and server entry point**

Create an Express app, disable `x-powered-by`, and return a `HealthResponse` from `GET /api/v1/health`. In `server.ts`, read `apiEnv.PORT` and call `listen`; do not add auth, database, logging infrastructure, or other routes.

- [ ] **Step 9: Run API tests and build**

Run:

```powershell
corepack pnpm test apps/api/src
corepack pnpm --filter @kalemny/api build
```

Expected: API tests and TypeScript build exit 0.

### Task 4: Minimal Next.js Application and Web Environment

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next-env.d.ts`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/src/config/env.test.ts`
- Create: `apps/web/src/config/env.ts`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_API_URL` from the browser-safe environment.
- Produces: `parseWebEnv(input)`, `webEnv`, and a minimal App Router application on port 3000.

- [ ] **Step 1: Add the web package and framework configuration**

Use Next.js 16, React 19, Zod 4, Tailwind CSS 4, `@tailwindcss/postcss`, and PostCSS. Configure App Router TypeScript with bundler module resolution and `@/*` mapped to `src/*`. The PostCSS config must load `@tailwindcss/postcss`.

- [ ] **Step 2: Write failing web environment tests**

```typescript
import { describe, expect, it } from "vitest";
import { parseWebEnv } from "./env";

describe("parseWebEnv", () => {
  it("provides the local API URL by default", () => {
    expect(parseWebEnv({})).toEqual({
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
    });
  });

  it("rejects a non-URL API value", () => {
    expect(() =>
      parseWebEnv({ NEXT_PUBLIC_API_URL: "not-a-url" }),
    ).toThrow();
  });
});
```

- [ ] **Step 3: Run the web environment test and verify RED**

Run: `corepack pnpm test apps/web/src/config/env.test.ts`

Expected: FAIL because `./env` does not exist.

- [ ] **Step 4: Implement browser-safe environment parsing**

Use a Zod object that accepts only `NEXT_PUBLIC_API_URL`, validates HTTP(S), and defaults to `http://localhost:4000`. Pass only that explicit property from `process.env`; never expose the full environment object to client code.

- [ ] **Step 5: Run the environment test and verify GREEN**

Run: `corepack pnpm test apps/web/src/config/env.test.ts`

Expected: 2 tests pass.

- [ ] **Step 6: Add the minimal App Router shell**

Create the required English root layout, import `globals.css`, and render a simple semantic page identifying the project and foundation state. Use only a few Tailwind utilities and no product workflow, authentication, or shadcn components.

- [ ] **Step 7: Build the web application**

Run: `corepack pnpm --filter @kalemny/web build`

Expected: Next.js production build exits 0.

### Task 5: Full Verification and Project State

**Files:**
- Modify: `docs/PROJECT_STATE.md`
- Modify as needed: files created in Tasks 1-4 only when verification exposes a defect.

**Interfaces:**
- Consumes: all Milestone 1 deliverables and exit criteria.
- Produces: fresh verification evidence and an accurate next-task record.

- [ ] **Step 1: Run formatting and inspect its changes**

Run:

```powershell
corepack pnpm format
git diff --check
```

Expected: files are consistently formatted and Git reports no whitespace errors.

- [ ] **Step 2: Run the complete static and automated verification suite**

Run:

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
```

Expected: every command exits 0 with no test failures or lint errors.

- [ ] **Step 3: Smoke-test the API development server**

Start `corepack pnpm dev:api`, wait for port 4000, request `http://localhost:4000/api/v1/health`, validate the JSON body, and stop the process.

Expected response:

```json
{"data":{"status":"ok"}}
```

- [ ] **Step 4: Smoke-test the web development server**

Start `corepack pnpm dev:web`, wait for port 3000, request `http://localhost:3000`, verify a 200 response containing the foundation page heading, and stop the process.

- [ ] **Step 5: Audit the final diff against milestone scope**

Run `git status --short`, `git diff --stat`, and targeted searches for Clerk, Prisma schema/models, OpenAI, microphone/voice, and product route implementation. Confirm `.serena/` remains untouched and untracked.

- [ ] **Step 6: Update operational project state**

Record Milestone 1 as completed with its verification commands. Set Milestone 2, Authentication + Database, as the next task. Do not implement any Milestone 2 behavior.

- [ ] **Step 7: Re-run verification after the documentation update**

Run:

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm format:check
git diff --check
```

Expected: all commands exit 0.
