# Setup: Chameron AI Command Centre

## 1. Connect the existing tools
1. Confirm the GitHub account connected to ChatGPT has access to `themohdtufail/Chameron-Digital`, `themohdtufail/BILL-OS` and `themohdtufail/DINE-OS`.
2. In Jules, install/connect the GitHub app to each repository you want Jules to work on.
3. In Claude Code, sign in with the existing Claude account and open the exact local clone for the product task. Do not assume the Claude subscription grants API access.
4. Keep each product repository as the source of truth. Use this repository only for shared policies, task intake and orchestration docs.

## 2. Enable Jules API dispatch
1. Open https://jules.google/settings and generate an API key.
2. In this repository, open **Settings → Secrets and variables → Actions → New repository secret**.
3. Create secret `JULES_API_KEY` with the key value. Never paste it into an issue or commit it.
4. In Jules, confirm the repository is connected and find its API source name/ID from the Jules API sources list. The workflow requires the exact source identifier (typically a `sources/...` resource name).
5. Open **Actions → Dispatch Jules task**, choose **Run workflow**, enter the source resource name, starting branch and one bounded task. Keep `require_plan_approval` enabled.
6. Inspect the resulting Jules session in Jules and the resulting branch/PR in GitHub. Do not treat session creation as proof that work is complete.

Official API documentation:
- https://jules.google/docs/api/reference/
- https://jules.google/docs/api/reference/authentication/
- https://jules.google/docs/usage-limits

## 3. Start with one bounded pilot
Recommended pilot: ask Jules to add or improve tests in a non-production branch of BILL OS, with no behavior changes. Verify the plan, inspect the diff, run the project's documented tests, and review the PR before merging.

## 4. What is not yet automated
This foundation does not yet call ChatGPT or Claude automatically. Their API keys, separate billing, spending controls, and model-specific adapters must be configured before enabling unattended API calls. Existing chat subscriptions do not automatically supply API access. At the current budget, use the subscriptions for human-in-the-loop planning/review and automate Jules/GitHub first.

## 5. Before expanding
- Add branch protection and required checks to product repositories.
- Add GitHub issue labels/statuses and a project board.
- Define monthly API spend caps and alert thresholds before adding OpenAI/Anthropic API calls.
- Add secret scanning and dependency/security checks.
- Keep a human approval gate for deploys, merges, external messages, ad spend and destructive operations.
