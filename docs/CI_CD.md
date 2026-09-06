# CI/CD & Deployment Safety

This document describes the automated quality gate added in Phase 4A-1 and how it fits into the existing Vercel deployment. It does not change payments, auth, the database schema, rate limiting, or any UI/feature behavior — see `docs/PHASE3_COMPLETION_AUDIT.md` for the audit that identified the gap this closes (no `.github/` directory, no CI at all).

## Local validation (run this before opening a PR)

These are the exact commands CI runs — running them locally first means CI should never surprise you:

```bash
npx tsc --noEmit   # TypeScript check (no dedicated npm script exists; this is the project's own convention)
npm run lint       # next lint
npm test           # vitest run — includes a real DB-integration test, needs DATABASE_URL
npm run build      # prisma migrate deploy && next build — also needs DATABASE_URL/DIRECT_URL
```

`npm test` and `npm run build` need a reachable Postgres database (the same requirement `npm run dev` already has — see `.env.example`). Point `DATABASE_URL`/`DIRECT_URL` at your local dev database; never point them at a shared staging or production database when running tests, since the rate-limit test writes and deletes real rows (in its own dedicated `vitest_rate_limit_probe` action namespace, but still real writes).

## CI: what GitHub Actions checks

`.github/workflows/ci.yml` runs on every pull request and every push to `main`. It is a **quality gate only — it never deploys anything.**

Job `quality-gate`:
1. Checkout
2. Setup Node.js 22 with npm's dependency cache
3. `npm ci` — installs exactly what `package-lock.json` pins (never resolves fresh versions)
4. `npx tsc --noEmit` — TypeScript check
5. `npm run lint`
6. `npx prisma migrate deploy` — applies the repo's committed migrations to a **disposable Postgres 16 container that exists only for this CI job** (spun up via GitHub Actions' `services:` — not production, not staging, not reachable from anywhere outside the runner, destroyed when the job ends)
7. `npm test` — the full Vitest suite, including the DB-integration test, against that same disposable database
8. `npm run build` — the repository's actual, unmodified build script (which re-runs `prisma migrate deploy` as a no-op, then `next build`)

**Not currently included: dependency review.** `actions/dependency-review-action` (which flags newly-introduced dependencies with high-severity known vulnerabilities on PRs) was tried in this workflow and removed after it failed with *"Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled."* That's a repository setting (**Settings → Security → Dependency graph**), currently off, that a repo admin needs to enable — a one-click, no-risk change. Once it's on, add this job back to `.github/workflows/ci.yml`:

```yaml
  dependency-review:
    name: Dependency review
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
```

**Every step in `quality-gate` must succeed or the workflow fails** — there is no `|| true`, no `continue-on-error`, and no step that can silently swallow a failure. A red check on a PR means: tests, types, lint, or the build genuinely broke.

## Production deployment: how code moves from development → PR → main → Vercel

1. Work happens on a branch, opened as a PR against `main`.
2. GitHub Actions CI (above) runs automatically on the PR and must pass.
3. Vercel's GitHub integration (configured in the Vercel dashboard, outside this repo — see [Vercel's docs](https://vercel.com/docs/deployments/git)) independently builds a **Preview deployment** for every push to the PR's branch, regardless of CI's result. CI and the Vercel preview build run in parallel and do not depend on each other.
4. On merge to `main`, Vercel's integration builds and promotes a **Production deployment** the same way.
5. **This CI workflow does not gate, trigger, or block the Vercel deployment in any way** — they are two independent systems watching the same GitHub events. Merging a PR with a failing CI check will still trigger a production deployment on Vercel today, because no branch protection rule currently requires the CI check to pass first (see below).

### Recommended branch protection (not yet enabled — requires a repository admin)

`main` currently has no branch protection rule (verified via the GitHub API as part of this phase). To make the CI check load-bearing rather than advisory, a repository admin should, in GitHub → Settings → Branches → Add rule for `main`:
- Require the `quality-gate` check to pass before merging.
- Require the branch to be up to date before merging.

This was **not** enabled as part of this phase — it changes who can merge and needs a human with repo-admin rights to opt into deliberately, and doing it silently would be a bigger, riskier change than "add CI."

## Environment variables: where they belong

| Scope | Where it lives | Example |
|---|---|---|
| Local development | `.env` (gitignored, copy `.env.example`) | your own dev DB, `OTP_DEV_MODE=true` |
| CI (this workflow) | Inline in `.github/workflows/ci.yml`'s `env:` block — **placeholder values only**, pointing at the disposable per-job Postgres container | `JWT_SECRET: "ci-placeholder-secret-not-a-real-credential"` |
| Preview/Production (Vercel) | Vercel project settings → Environment Variables, scoped per-environment | real `DATABASE_URL`/`DIRECT_URL` (Neon), real `JWT_SECRET`, real `ADMIN_PASSWORD` |

CI never reads, needs, or has access to the real Preview/Production environment variables — it has its own disposable database and placeholder secrets, entirely separate from Vercel's.

## Secrets: what must never be committed to Git

Never commit: database passwords/connection strings with real credentials, `JWT_SECRET`, any payment gateway key, AWS/S3 credentials, WhatsApp/SMS provider credentials, private keys, or webhook secrets. Only `.env.example` (a template with no real values) is tracked — confirmed via `git log --all --diff-filter=A` that no `.env` file has ever been committed to this repository's history. If a real credential is ever accidentally committed, treat it as compromised (rotate it), not just delete the file — it remains in git history until purged.

## If CI or a Vercel deployment fails

- **CI fails on `TypeScript check` or `Lint`:** run the same command locally (see above) — it will reproduce exactly, since CI runs nothing you can't run yourself.
- **CI fails on `Test`:** check whether it's the DB-integration test (`rate-limit.test.ts`) — if only that one fails locally but not in CI (or vice versa), suspect a stale local database schema; run `npx prisma migrate deploy` locally first.
- **CI fails on `Production build`:** reproduce with `npm run build` locally using a real (even local/dev) `DATABASE_URL` — this step runs `prisma migrate deploy` for real, so a schema drift between your migrations and your local DB will surface here too.
- **Vercel deployment fails independently of CI:** check the Vercel dashboard's build logs for that deployment directly — CI passing does not guarantee the Vercel build will succeed, since they run in separate environments with separate (real vs. placeholder) environment variables.
