#!/usr/bin/env bash
set -euo pipefail

load_env() {
  [[ -f .env ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == *=* ]] || continue
    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    key="${key#"${key%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value#\"}"
    value="${value%\"}"
    value="${value#\'}"
    value="${value%\'}"
    if [[ "$key" == "GH_TOKEN" || "$key" == "GITHUB_TOKEN" || "$key" == "GIT_USER_NAME" || "$key" == "GIT_USER_EMAIL" || "$key" == "COAUTHOR_NAME" || "$key" == "COAUTHOR_EMAIL" ]]; then
      if [[ -z "${!key:-}" ]]; then
        export "$key=$value"
      fi
    fi
  done < .env
}

apply_git_identity() {
  local name="${GIT_USER_NAME:-${GIT_AUTHOR_NAME:-}}"
  local email="${GIT_USER_EMAIL:-${GIT_AUTHOR_EMAIL:-}}"
  if [[ -z "$name" || -z "$email" ]]; then
    echo "Set GIT_USER_NAME and GIT_USER_EMAIL in .env so Git can create commits."
    exit 1
  fi
  export GIT_AUTHOR_NAME="$name"
  export GIT_AUTHOR_EMAIL="$email"
  export GIT_COMMITTER_NAME="$name"
  export GIT_COMMITTER_EMAIL="$email"
  git config --local user.name "$name" >/dev/null 2>&1 || true
  git config --local user.email "$email" >/dev/null 2>&1 || true
}

require_gh() {
  load_env
  apply_git_identity
  if ! command -v gh >/dev/null 2>&1; then
    echo "GitHub CLI is required. Install it from https://cli.github.com."
    exit 1
  fi
  if [[ -n "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]]; then
    export GH_TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"
    local login
    login="$(gh api user --jq .login)"
    git config --local --unset-all credential.https://github.com.helper >/dev/null 2>&1 || true
    git config --local --add credential.https://github.com.helper ""
    git config --local --add credential.https://github.com.helper "!gh auth git-credential"
    echo "Authenticated as ${login} via GH_TOKEN."
    return
  fi
  if ! gh auth status; then
    echo "GitHub authentication is required. Run gh auth login, or put a repo-scoped token in .env as GH_TOKEN."
    exit 1
  fi
}

require_clean_tree() {
  if [[ -n "$(git status --short)" ]]; then
    echo "Your working tree has changes. Commit or stash them before running the playground."
    exit 1
  fi
}

default_branch() {
  git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's#refs/remotes/origin/##' || echo "main"
}

add_log_entry() {
  local label="$1"
  local stamp
  stamp="$(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "- ${stamp} - ${label}" >> playground-log.md
}

new_sandbox_pr() {
  local branch="$1"
  local title="$2"
  local body="$3"
  local label="$4"
  local commit_message="$5"
  local base
  base="$(default_branch)"

  git checkout "$base"
  git pull --ff-only
  git checkout -b "$branch"
  add_log_entry "$label"
  git add playground-log.md
  git commit -m "$commit_message"
  git push -u origin "$branch"
  gh pr create --base "$base" --head "$branch" --title "$title" --body "$body"
  gh pr merge "$branch" --merge --delete-branch --subject "$title"
  git checkout "$base"
  git pull --ff-only
}

run_pull_yolo() {
  require_gh
  require_clean_tree

  if [[ ! -f playground-log.md ]]; then
    touch playground-log.md
    git add playground-log.md
    git commit -m "Create playground log"
    git push
  fi

  local suffix
  suffix="$(date '+%Y%m%d%H%M%S')"
  new_sandbox_pr "playground-pull-yolo-a-${suffix}" "Playground PR 1" "Creates a sandbox PR for learning Pull Shark and YOLO workflows." "Pull/Yolo practice PR 1" "Add playground PR 1"
  new_sandbox_pr "playground-pull-yolo-b-${suffix}" "Playground PR 2" "Creates a second sandbox PR for learning Pull Shark workflows." "Pull/Yolo practice PR 2" "Add playground PR 2"
}

run_pair() {
  require_gh
  require_clean_tree

  if [[ -z "$COAUTHOR_NAME" ]]; then
    read -r -p "Co-author GitHub name: " COAUTHOR_NAME
  fi
  if [[ -z "$COAUTHOR_EMAIL" ]]; then
    read -r -p "Co-author GitHub email: " COAUTHOR_EMAIL
  fi
  if [[ -z "$COAUTHOR_NAME" || -z "$COAUTHOR_EMAIL" ]]; then
    echo "Co-author name and email are required."
    exit 1
  fi

  local base suffix branch
  base="$(default_branch)"
  suffix="$(date '+%Y%m%d%H%M%S')"
  branch="playground-pair-${suffix}"

  git checkout "$base"
  git pull --ff-only
  git checkout -b "$branch"
  add_log_entry "Pair Extraordinaire practice with ${COAUTHOR_NAME}"
  git add playground-log.md
  git commit -m $'Add co-authored playground entry\n\n'"Co-authored-by: ${COAUTHOR_NAME} <${COAUTHOR_EMAIL}>"
  git push -u origin "$branch"
  gh pr create --base "$base" --head "$branch" --title "Add co-authored playground entry" --body "Creates a co-authored sandbox PR for learning Pair Extraordinaire."
  gh pr merge "$branch" --merge --delete-branch --subject "Add co-authored playground entry"
  git checkout "$base"
  git pull --ff-only
}

run_quickdraw() {
  require_gh
  local title url
  title="Quickdraw playground issue $(date '+%Y%m%d%H%M%S')"
  url="$(gh issue create --title "$title" --body "Created by Git Badges Playground and closed quickly for Quickdraw practice.")"
  echo "$url"
  gh issue close "$url" --reason completed
}

show_status() {
  require_gh
  git status --short --branch
  git remote -v
  gh repo view --json nameWithOwner,visibility,url
}

show_menu() {
  echo "Git Badges Playground"
  echo "1. status"
  echo "2. pull-yolo"
  echo "3. pair"
  echo "4. quickdraw"
  read -r -p "Choose a mode: " choice
  case "$choice" in
    1) show_status ;;
    2) run_pull_yolo ;;
    3) run_pair ;;
    4) run_quickdraw ;;
    *) echo "Unknown choice." ;;
  esac
}

load_env
MODE="${1:-menu}"
COAUTHOR_NAME="${COAUTHOR_NAME:-}"
COAUTHOR_EMAIL="${COAUTHOR_EMAIL:-}"

case "$MODE" in
  status) show_status ;;
  pull-yolo) run_pull_yolo ;;
  pair) run_pair ;;
  quickdraw) run_quickdraw ;;
  *) show_menu ;;
esac
