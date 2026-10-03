# Development Environment

How this Mac is set up to build, version, and deploy TastePilot web: what's installed, how GitHub and AWS authentication work, and how to keep it all maintained.

For running the app, see [LOCAL_DEV.md](LOCAL_DEV.md). For deploying, see [DEPLOY.md](DEPLOY.md).

## The big picture

```
                 git push / gh (HTTPS + GitHub token from macOS Keychain)
  ┌──────────┐ ─────────────────────────────────────────────────────▶ ┌─────────────────────────────┐
  │ This Mac │                                                        │ GitHub                      │
  │          │                                                        │ noahjh-lang/ui-taste-pilot  │
  │ Node 24  │                                                        └─────────────────────────────┘
  │ gh, aws  │   npm run deploy (CDK, short-lived creds from aws login)
  │ CDK      │ ─────────────────────────────────────────────────────▶ ┌─────────────────────────────┐
  └──────────┘                                                        │ AWS us-east-1               │
                                                                      │ S3 + CloudFront + WAF       │
                                                                      └─────────────────────────────┘
```

- **Code** lives on GitHub. You work on a branch, push it, open a pull request, and merge into `main`.
- **Deploys** go from this Mac straight to AWS with CDK. There is no CI pipeline yet; see [NOT_IMPLEMENTED.md](NOT_IMPLEMENTED.md).
- **No Homebrew.** Every tool is installed per user, in your home folder, with no `sudo`.

## Installed tools

| Tool | Version | Installed at | Loaded by |
| --- | --- | --- | --- |
| nvm (Node version manager) | 0.40.8 | `~/.nvm` | `~/.zprofile` |
| Node.js + npm | 24.21.0 LTS / 11.19.0 | `~/.nvm/versions/node/` | nvm (`default` alias → `lts/*`) |
| GitHub CLI (`gh`) | 2.102.0 | `~/.local/bin/gh` | `PATH` in `~/.zshrc` |
| AWS CLI (`aws`) | 2.37.9 | `~/.local/aws-cli/`, symlinked to `~/.local/bin/aws` | `PATH` in `~/.zshrc` |
| AWS CDK CLI | from `infra/package.json` | `node_modules` (per project) | `npx cdk` |
| Playwright Chromium | Playwright 1.63 | `~/Library/Caches/ms-playwright/` | used by `npm run e2e` |
| git | Apple Command Line Tools | `/Library/Developer/CommandLineTools` | system |

**Shell setup.** Two startup files matter:

- `~/.zprofile` loads nvm. It runs for *login* shells, which is what VS Code's terminal and Terminal.app open by default.
- `~/.zshrc` adds `~/.local/bin` to `PATH`, for `gh` and `aws`.

If `node` is ever "command not found" while `aws` works, your terminal isn't starting as a login shell. Run `source ~/.zprofile`, or move the three nvm lines from `~/.zprofile` into `~/.zshrc`.

**Quick health check:**

```sh
node -v && npm -v && gh --version | head -1 && aws --version && git --version
```

## GitHub

### Repository and workflow

- Repo: https://github.com/noahjh-lang/ui-taste-pilot (default branch `main`)
- Workflow: branch from `main` → commit → push → pull request → merge on GitHub.

```sh
git switch main && git pull                 # start from the latest main
git switch -c feature/my-change             # new branch
# ...work, then:
git add -A && git commit -m "Describe the change"
git push -u origin feature/my-change
gh pr create --fill                         # open a PR from the branch
gh pr view --web                            # open it in the browser
```

Branch state when this was written:

| Branch | State |
| --- | --- |
| `main` | Contains the base scaffold (PR #1, merged) |
| `scaffold/base-web-app` | Merged via PR #1. Safe to delete: `git branch -d scaffold/base-web-app && git push origin --delete scaffold/base-web-app` |
| `deploy/aws-static-spa` | AWS deploy work. Local only, not yet committed or pushed |

### How authentication works

There is no SSH key on this Mac. Git talks to GitHub over **HTTPS** using a **classic personal access token (PAT)**, and the token is stored in two places:

| Used by | Where the token is stored | How it got there |
| --- | --- | --- |
| `git push` / `git pull` | macOS Keychain, item **github.com** (Internet password) | `git credential approve`; git's `osxkeychain` helper reads it |
| `gh` | macOS Keychain, as a separate `gh:github.com` entry | `gh auth login --with-token` |

Both entries hold the same token today. When the token changes, update **both**, as described under rotation below.

**Check status:**

```sh
gh auth status                 # shows the account and token scopes (never the token itself)
git ls-remote origin HEAD      # succeeds silently if git can authenticate
```

### Token hygiene: do this soon

1. **Narrow the token's scopes.** The current classic token has far more access than this repo needs, including `admin:org`, `delete:packages`, `admin:public_key`, and `admin:repo_hook`. A token for this workflow only needs **`repo`**, **`workflow`** (to push CI files later), and **`read:org`** (which `gh` requires). Create a replacement with just those scopes and rotate to it.
2. **Confirm the old fine-grained token is deleted.** The first token (`ui-taste-pilot local dev`) was pasted into a chat session, so treat it as exposed. Check https://github.com/settings/personal-access-tokens and delete it if it still exists.
3. **Know the expiry date.** Classic tokens expire on the date you chose. When it passes, pushes fail with an authentication error, and you need to rotate the token.

### Rotating the token

Create the new token at https://github.com/settings/tokens, then run this in your terminal. It reads the token without showing it and updates both git and `gh`:

```sh
read -rs "TOKEN?Paste GitHub token: " && echo \
  && printf 'protocol=https\nhost=github.com\n\n' | git credential reject \
  && printf 'protocol=https\nhost=github.com\nusername=noahjh-lang\npassword=%s\n\n' "$TOKEN" | git credential approve \
  && printf '%s' "$TOKEN" | gh auth login --with-token --git-protocol https \
  && unset TOKEN && gh auth status
```

Then delete the old token on GitHub. Never paste a token into chat, a commit, or a file in the repo.

## AWS

### How you connect

You sign in with **`aws login`**, which uses your AWS console sign-in through the browser. It gives the CLI **short-lived credentials** that refresh automatically while the login session is valid. No long-lived access keys are created or stored.

```sh
aws login --region us-east-1     # opens the browser; complete sign-in there
aws sts get-caller-identity      # confirms which account/user you're acting as
aws logout                       # clears the cached login credentials
```

- The cached session lives under `~/.aws/`. Never commit or copy this folder.
- **CDK** (`npm run deploy`) picks up the same credentials. If it ever says it can't find credentials, run `eval "$(aws configure export-credentials --format env)"` in that shell first.
- **Region:** everything is in **us-east-1**. CloudFront's WAF must be there, and the stack pins it.

**Status when this was written:** the AWS CLI is installed but **not signed in**, and **nothing is deployed**. Follow [DEPLOY.md](DEPLOY.md) from step 1.

### What gets created in your account

| Resource | Purpose |
| --- | --- |
| CloudFormation stack **`TastePilotWeb`** | Everything for the site: S3 bucket, CloudFront distribution and function, WAF web ACL and IP sets, budget |
| CloudFormation stack **`CDKToolkit`** | Created once by `cdk bootstrap`: a staging bucket and the IAM roles CDK deploys with |

### Deploy settings: `infra/config.json`

This file is gitignored. It is the single source of truth for who can reach the site and where cost alerts go:

```json
{ "allowedIps": ["<your-ip>/32"], "budgetEmail": "<your email>", "monthlyBudgetUsd": 5 }
```

- **Your IP changes**, for example on a new network or when your ISP reassigns it. You'll then get **403** on the site. Run `curl -s https://checkip.amazonaws.com`, update `allowedIps`, and run `npm run deploy`.
- **Adding a teammate:** add their IP as another entry and redeploy.

### Keeping an eye on cost

- **Budget emails:** you get alerts at 50% and 100% of `monthlyBudgetUsd`, and when spend is forecast to exceed it.
- **Billing console:** https://console.aws.amazon.com/billing/home → *Bills* and *Cost Explorer*.
- **Free plan check:** CloudFront console → your distribution → **Manage plan** should say **Free**. If it says pay-as-you-go, redo step 6 of [DEPLOY.md](DEPLOY.md).

## Secrets inventory

| Secret | Lives in | Never put it in |
| --- | --- | --- |
| GitHub token | macOS Keychain (`github.com` and `gh:github.com`) | chat, repo files, shell history |
| AWS session | `~/.aws/` (short-lived, auto-refreshed) | the repo |
| API base URL and other app settings | `apps/web/.env.local` (gitignored) | `NEXT_PUBLIC_*` variables if they're secret: anything `NEXT_PUBLIC_` ships to the browser |
| Allowlist IPs, budget email | `infra/config.json` (gitignored) | the repo |

`.gitignore` also ignores a `creds/` folder. Keep anything credential-like there if it must live inside the project.

## Maintenance

### Updating tools

```sh
# Node: install the newest LTS and make it the default
nvm install --lts && nvm alias default 'lts/*'
# Then update .nvmrc if the major version changed, and reinstall:
npm ci

# Project dependencies: see what's outdated, then update deliberately
npm outdated --workspaces
npm update --workspaces          # within the current version ranges
npx playwright install chromium  # after a Playwright upgrade

# AWS CLI: re-run the same per-user installer (same choices.xml approach), or:
aws --version   # then compare with https://github.com/aws/aws-cli/blob/v2/CHANGELOG.rst

# GitHub CLI: gh tells you when a new version exists; reinstall the macOS zip
# from https://github.com/cli/cli/releases into ~/.local/bin
```

After any upgrade, run the full check before committing:

```sh
npm run typecheck && npm run lint && npm test && npm run e2e
```

### Clean slate for the project

```sh
rm -rf node_modules apps/*/node_modules packages/*/node_modules infra/node_modules \
       apps/web/.next apps/web/out infra/cdk.out
npm ci
```

### Uninstalling the tools

| Tool | Remove |
| --- | --- |
| nvm + Node | `rm -rf ~/.nvm`, and delete the three NVM lines from `~/.zprofile` |
| GitHub CLI | `gh auth logout`, then `rm ~/.local/bin/gh` |
| AWS CLI | `aws logout --all`, then `rm -rf ~/.local/aws-cli ~/.local/bin/aws ~/.local/bin/aws_completer ~/.aws` |
| Playwright browsers | `rm -rf ~/Library/Caches/ms-playwright` |
| GitHub token in Keychain | `printf 'protocol=https\nhost=github.com\n\n' \| git credential reject`, then delete the token on GitHub |

## Troubleshooting

| Symptom | Likely cause → fix |
| --- | --- |
| `node: command not found` | Not a login shell → `source ~/.zprofile` |
| `gh` / `aws: command not found` | `PATH` not loaded → `source ~/.zshrc` |
| `git push` → 403 "Permission denied" | The token lacks `repo` scope, or a fine-grained token lacks Contents: write → rotate the token |
| `git push` → "could not read Username" or auth failed | The token expired or was removed from Keychain → rotate the token |
| `gh` says "missing required scope" | Add that scope to the token (usually `read:org`) and rotate |
| `aws` → `NoCredentials` / `ExpiredToken` | `aws login --region us-east-1` |
| Deployed site returns 403 for you | Your IP changed → update `infra/config.json`, `npm run deploy` |
| `npm run deploy` → config error | Fix the message it prints. It deliberately refuses an empty allowlist or the placeholder email |
