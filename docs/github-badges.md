# GitHub Badges Tutorial

GitHub badges, also called GitHub profile achievements, appear on a user's GitHub profile after certain public GitHub activities. This guide explains the badges people most often search for and links them to the Git Badges Playground scripts.

## GitHub Badges Covered

- Pull Shark
- YOLO
- Quickdraw
- Pair Extraordinaire
- Starstruck
- Galaxy Brain
- Public Sponsor

## Pull Shark

Pull Shark is related to merged pull requests. In Git Badges Playground, run:

```bash
npm start -- pull-yolo
```

The script creates two real branches, opens two pull requests, merges them, and deletes the remote branches.

## YOLO

YOLO is related to merging a pull request without a review. The `pull-yolo` mode opens and merges pull requests directly in a repository you control.

Branch protection rules that require reviews can prevent this workflow from counting.

## Quickdraw

Quickdraw is related to closing an issue or pull request quickly after opening it.

```bash
npm start -- quickdraw
```

## Pair Extraordinaire

Pair Extraordinaire is related to a merged pull request containing a co-authored commit.

```bash
npm start -- pair --coauthor-name "Name" --coauthor-email "email@example.com"
```

Use a real GitHub email for the co-author.

## Starstruck

Starstruck requires stars on a personal repository. Read [starstruck.md](starstruck.md).

## Galaxy Brain

Galaxy Brain requires accepted answers in GitHub Discussions. Read [galaxy-brain.md](galaxy-brain.md).
