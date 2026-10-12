# Chameron AI Team Operating Rules

This repository is the coordination workspace for Chameron Industries' AI-assisted work. It is not the production source of truth for any product repository.

## Team roles
- **Owner (Mohd Tufail):** sets goals, approves budgets, customer-facing claims, legal/tax/financial commitments, production releases, destructive changes, and external messages.
- **ChatGPT:** intake, clarify goals, decompose work, research/analysis, draft specs, compare options, and perform independent acceptance review.
- **Claude / Claude Code:** technical design, substantial implementation, refactoring, documentation, and complex reasoning.
- **Google Jules:** isolated coding tasks, bug fixes, tests, and reviewable GitHub changes.
- **GitHub Actions:** repeatable checks, routing, status and audit trail. It is not an AI model.

## Operating rules
1. Every order must state outcome, scope, repository, constraints, acceptance criteria, and what must not change.
2. Use the actual product repository as the source of truth: BILL OS is `themohdtufail/BILL-OS`; DINE OS is `themohdtufail/DINE-OS`. Confirm other product repositories before dispatch.
3. One issue = one deliverable. Split independent tasks; avoid two agents editing the same files or branch at once.
4. Agents work on branches and propose pull requests. Never give agents production secrets or permission to publish, deploy, spend money, send external messages, or change customer data without explicit approval.
5. Do not merge automatically at first. Require tests, human review, and a clear rollback plan for production-impacting changes.
6. Treat agent output as untrusted until code, claims, links, tests and costs have been checked.
7. Never put API keys, passwords, customer records, private keys, or production data in issues, commits, logs, or prompts.
8. For research/marketing, include source URLs, dates, assumptions, target audience and claim verification. Do not invent prices, legal requirements, customer results or competitor features.
9. Report status as: **Proposed → Approved → In progress → Review → Accepted / Blocked**.
10. If credentials, API access, repository access, or a decision is missing, stop at that boundary and report the exact owner action needed.

## Chameron Digital product portfolio
- BILL OS
- DINE OS
- GYM OS
- EDU OS
- Grocery OS

Do not silently change this finalized lineup. Use a task-specific brief rather than assuming every task is software work.
