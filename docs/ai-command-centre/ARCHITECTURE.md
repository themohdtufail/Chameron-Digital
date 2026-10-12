# Chameron AI Command Centre — Architecture

## Goal
A single owner-facing intake that turns one order into trackable work across software, marketing, research, planning and operations, using ChatGPT, Claude and Google Jules where appropriate.

## Low-cost first release
- **GitHub Issues:** task intake, acceptance criteria, status and audit trail.
- **GitHub Projects (optional):** portfolio board across products and business functions.
- **GitHub Actions:** event-driven routing and deterministic checks.
- **Google Jules API:** programmatic coding sessions for repositories connected in Jules.
- **ChatGPT and Claude subscriptions:** use interactively for planning/review/coding as their subscription interfaces permit. A subscription must not be assumed to include API access.
- **Secrets:** GitHub Actions repository secrets for API keys; never commit them.

## Important budget reality
A fully unattended system that calls OpenAI and Anthropic APIs needs API credentials and separate API billing. ChatGPT Plus/Go/other chat subscriptions and Claude subscriptions are not interchangeable with API credits. At ₹0–₹1,000/month additional budget, begin with GitHub's available free features, the user's existing subscriptions, and Jules' available quota. Avoid an always-on paid server. API-driven ChatGPT/Claude automation must remain disabled until a spending cap is set and tested.

## Phased design
1. **Foundation:** standard task brief, role policy, GitHub workflow, manual Jules dispatch. Keep production changes approval-gated.
2. **Task router:** a small serverless endpoint or GitHub issue workflow reads a structured task and chooses agents based on task type. Do not implement model calls until API keys and cost limits are approved.
3. **Agent adapters:** separate adapters for OpenAI API, Anthropic API, and Jules API. Log task IDs, model/provider, timestamps, token/cost metadata where available, result links, and failures.
4. **Review gate:** run repository tests and security checks; require an independent review; create a PR. No direct pushes to protected production branches.
5. **Owner dashboard:** show intake, owner, agent, state, spend estimate, links, blockers and approval actions. Start with GitHub Issues/Projects before building a custom dashboard.
6. **Business workflows:** marketing/research/planning use a source-backed brief and document outputs; coding routes to product repositories; operations tasks requiring external side effects always ask for approval.

## Routing policy
- Product strategy, acceptance criteria, independent critique: ChatGPT.
- Complex technical design, refactoring, implementation plans: Claude.
- Bounded repository changes, bug fixes, test additions: Jules.
- Research: whichever available model has suitable search access; record source URLs and access dates.
- Marketing: strategy and drafts may be automated; publishing, ad spend, claims, customer outreach and trademark/legal submissions require approval.
- Cross-cutting task: coordinator creates independent subtasks and one final acceptance checklist.

## Safety boundaries
Require explicit human approval for production deployment, merges that affect customers, data deletion/migration, payments, ad spend, legal filings, outbound messages, credentials, access-control changes and irreversible operations.
