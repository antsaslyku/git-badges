# Git Badges Playground: GitHub Achievements Tutorial and Unlock Sandbox

An interactive sandbox and tutorial for learning GitHub profile badges, GitHub achievements, Pull Shark, YOLO, Quickdraw, Pair Extraordinaire, Starstruck, and Galaxy Brain.

Most GitHub badges guides tell you what to do. This repo gives you a guided TypeScript playground that creates real branches, commits, pull requests, issues, and merges in your own fork or repository so you can understand the workflow while aiming for achievements like Pull Shark, YOLO, Quickdraw, and Pair Extraordinaire.

> Important: GitHub decides when achievements are awarded. This project helps you perform legitimate qualifying actions, but it cannot guarantee instant badge unlocks.

## What This Playground Can Help With

| Achievement | What it practices | Automation level |
| --- | --- | --- |
| Quickdraw | Create and close an issue quickly | Guided |
| Pull Shark | Open and merge pull requests | Automated with `gh` |
| YOLO | Merge a pull request without review | Automated with `gh` |
| Pair Extraordinaire | Add a `Co-authored-by:` trailer to a merged PR | Guided and automated |
| Starstruck | Improve a repo so people may star it | Strategy guide |
| Galaxy Brain | Give accepted answers in Discussions | Strategy guide |
| Public Sponsor | Sponsor an open source maintainer | Guide only |

## Fast Start

Fork this repository, clone your fork, then run the TypeScript playground. Node.js 22.18 or newer is required.

```bash
git clone https://github.com/YOUR_USERNAME/git-badges.git
cd git-badges
npm start
```

That opens a menu. To skip the menu:

```bash
npm start -- status
npm start -- pull-yolo
npm start -- quickdraw
npm start -- pair --coauthor-name "Name" --coauthor-email "email@example.com"
```

You can also run the file directly:

```bash
node scripts/unlock.ts
```

The older PowerShell and Bash scripts in `scripts/` still work if you prefer them.

## Requirements

- Node.js 22.18 or newer
- Git
- GitHub CLI: `gh`
- A public GitHub repository that you own or can push to
- GitHub authentication: either `gh auth login` or a repo-scoped `GH_TOKEN`

Create a classic token with the `repo` scope, or a fine-grained token with access to this repository and Contents, Pull requests, and Issues read/write: https://github.com/settings/tokens

Then either log in:

```bash
gh auth login
```

or copy `.env.example` to `.env` and set the token (`.env` is gitignored):

```bash
GH_TOKEN=ghp_your_token
GIT_USER_NAME=YourGitHubLogin
GIT_USER_EMAIL=you@example.com
COAUTHOR_NAME=OtherGitHubName
COAUTHOR_EMAIL=other-account@users.noreply.github.com
```

Check authentication:

```bash
node scripts/unlock.ts status
```

## What The Script Does

The script is an interactive assistant. You choose what to run:

- `pull-yolo`: creates two small branches, opens two PRs, merges them without review, then deletes the branches.
- `pair`: creates a branch with a `Co-authored-by:` commit trailer, opens a PR, and merges it.
- `quickdraw`: creates an issue and closes it quickly.
- `status`: checks GitHub authentication, remote config, and repository visibility.

The script writes small entries into `playground-log.md` so every PR has a real file change.

## Achievement Notes

### Pull Shark

Pull Shark is awarded for merged pull requests. The first visible badge usually appears after two merged PRs. Higher tiers require more merged PRs.

The `pull-yolo` mode creates and merges two PRs in the current repository.

### YOLO

YOLO is awarded for merging a pull request without a review. The `pull-yolo` mode merges PRs directly without requesting or approving a review.

If your repository has branch protection that requires review, YOLO will not trigger from that repository.

### Pair Extraordinaire

Pair Extraordinaire is awarded for co-authoring a merged pull request.

The `pair` mode reads `COAUTHOR_NAME` and `COAUTHOR_EMAIL` from `.env`, then creates a commit with this format and merges the PR:

```text
Co-authored-by: Name <email@example.com>
```

Keep `GH_TOKEN` as the account that opens the PR (`kinexbtdev`). Put the **other** GitHub account in `COAUTHOR_NAME` / `COAUTHOR_EMAIL`. The email must already be verified on that second GitHub account (Settings → Emails). A GitHub noreply address counts:

```text
12345678+username@users.noreply.github.com
```

You can find that address on the second account under Settings → Emails, or from `https://api.github.com/users/USERNAME` (`id` plus login).

### Quickdraw

Quickdraw is awarded for closing an issue or pull request within five minutes of opening it.

The `quickdraw` mode creates an issue and closes it immediately.

### Starstruck

Starstruck requires a repository owned by your personal account to receive stars. Use the guide in [docs/starstruck.md](docs/starstruck.md) to make the repo useful and shareable.

### Galaxy Brain

Galaxy Brain requires accepted answers in GitHub Discussions. This cannot be automated responsibly. Use the guide in [docs/galaxy-brain.md](docs/galaxy-brain.md) to find real questions and answer them well.

## Responsible Use

This repo is for learning GitHub workflows in your own public repositories. Do not spam maintainers, open fake PRs in other people's projects, buy stars, or create low-quality discussion answers just for badges.

Badges are more fun when the activity is real.

## Indexable Mirrors

These pages exist so search engines, AI search tools, and readers can find the right entry point:

- [GitHub badges tutorial](docs/github-badges.md)
- [GitHub achievements playground](docs/github-achievements.md)
- [LLM guide](llms.txt)

## Troubleshooting

If a badge does not appear immediately:

- Wait. GitHub achievements can take time to process.
- Confirm the repo is public.
- Confirm the PR was merged, not just closed.
- Confirm the action happened under your GitHub account.
- Check your profile settings to make sure achievements are visible.

More details are in [docs/troubleshooting.md](docs/troubleshooting.md).

## License

MIT
