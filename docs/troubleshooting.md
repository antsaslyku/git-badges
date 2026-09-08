# Troubleshooting

## Node.js is missing or too old

The TypeScript playground needs Node.js 22.18 or newer.

```bash
node --version
npm start
```

If you cannot upgrade Node, the PowerShell and Bash scripts in `scripts/` still work.

## PowerShell says running scripts is disabled

Windows is blocking `npm.ps1`. Do not use `npm start` in that terminal. Run Node directly:

```powershell
node scripts/unlock.ts
```

Or call the cmd shim instead:

```powershell
npm.cmd start
```

To allow scripts for this terminal only:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
npm start
```

## GitHub CLI is not logged in

You can use a browser login:

```bash
gh auth login
```

Or skip that and use a token. Copy `.env.example` to `.env`, then add a repo-scoped token from https://github.com/settings/tokens:

```bash
GH_TOKEN=ghp_your_token
```

Then verify:

```bash
node scripts/unlock.ts status
```

Do not commit `.env` or paste the token into chat.

## The script says the working tree is dirty

Commit or stash your changes before running the playground.

Check status:

```bash
git status
```

## The PR cannot be merged

Common causes:

- Branch protection requires reviews.
- The repository is archived.
- You do not have write access.
- The branch has conflicts.

Use your own fork or a repository where you have full write access.

## Badge did not appear

GitHub achievements can take time to process.

Check:

- The repository is public.
- The PR was merged, not closed.
- The issue was closed within five minutes for Quickdraw.
- The co-author email matches a GitHub account for Pair Extraordinaire.
- Achievements are visible in your profile settings.

## Actions workflow did not unlock anything

The Actions workflow is a demo. Achievement credit is more reliable when the local script runs under your authenticated GitHub account.
