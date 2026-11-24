<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project conventions

## Task Completion requirements

- Run `format:check` and `lint` against touched files; fix errors introduced by the change. Use `pnpm format:check <files>` and `pnpm lint <files>`; use `.` for a full scan.
- Run `typecheck` for the owning app/workspace. TypeScript checks use the project configuration, not isolated file arguments. Run `check` for broad changes.
- Run Vitest against touched domains. Create concise tests for important business/server logic in `tests/unit/<domain>/` (for example, `tests/unit/search/`); avoid surface styling and boilerplate assertions. Defer e2e tooling and suites until explicitly requested.
- Update relevant docs when architecture, behavior, or setup changes. Report checks that could not run.

## Server structure

- Keep domain persistence, services, and mutation entrypoints separate. Services enforce authorization and business rules; UI never imports raw persistence modules.
- Next.js Server Actions are for mutations, never fetching. With Convex, queries fetch and backend handlers enforce authorization.

## Docs

- Keep `docs/architecture.md` and `docs/server-structure.md` aligned with the implementation.
- Document major feature domains and behaviors under `docs/<domain>/` (for example, `docs/search/`): key flows, permissions, data relationships, and operational details where relevant.
- Update affected docs with feature changes; focus on conceptual behavior and possible confusion, not every small edit. Do not commit agent plans or checklists.

## UI style

- Use the default shadcn theme and standard scaffold fonts. Do not add custom colors, palettes, theme tokens, or fonts unless explicitly requested.
- Build UI almost entirely from shadcn primitives and basic flex/grid containers. Limit Tailwind to necessary mobile-first layout and spacing; avoid non-layout classes and custom primitive styling.
- Preserve functional light, dark, and system theme switching; use semantic theme tokens.
- Always use available shadcn/ui primitives where applicable.
- Never use all caps text or uppercase styling transformations.
- Avoid excessive visible containers; place content on the page background.
- Establish hierarchy through composition and primitive defaults; leave additional typography styling to the human.
- Use design to imply UX instead of explanatory instructions; retain necessary labels and accessible names.
- Limit visible UI verbosity.
- Use mostly minimal layout styling and shadcn/ui primitives; leave direct styling decisions to the human.
