param(
    [ValidateSet("menu", "status", "pull-yolo", "pair", "quickdraw")]
    [string]$Mode = "menu",
    [string]$CoAuthorName = "",
    [string]$CoAuthorEmail = ""
)

$ErrorActionPreference = "Stop"

function Run-Gh {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & gh @Args
}

function Require-CleanTree {
    $status = git status --short
    if ($status) {
        Write-Host "Your working tree has changes. Commit or stash them before running the playground."
        exit 1
    }
}

function Load-DotEnv {
    if (-not (Test-Path ".env")) {
        return
    }
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }
        $separator = $line.IndexOf("=")
        $key = $line.Substring(0, $separator).Trim()
        $value = $line.Substring($separator + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($key -in @("GH_TOKEN", "GITHUB_TOKEN", "COAUTHOR_NAME", "COAUTHOR_EMAIL")) {
            $existing = [Environment]::GetEnvironmentVariable($key)
            if (-not $existing) {
                Set-Item -Path "Env:$key" -Value $value
            }
        }
    }
}

function Require-Gh {
    Load-DotEnv
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Host "GitHub CLI is required. Install it from https://cli.github.com."
        exit 1
    }
    if ($env:GH_TOKEN -or $env:GITHUB_TOKEN) {
        if (-not $env:GH_TOKEN) {
            $env:GH_TOKEN = $env:GITHUB_TOKEN
        }
        $login = Run-Gh api user --jq ".login"
        if ($LASTEXITCODE -ne 0 -or -not $login) {
            Write-Host "GitHub token is missing or invalid."
            exit 1
        }
        $previous = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        git config --local --unset-all credential.https://github.com.helper | Out-Null
        $ErrorActionPreference = $previous
        git config --local --add credential.https://github.com.helper ""
        git config --local --add credential.https://github.com.helper "!gh auth git-credential"
        Write-Host "Authenticated as $login via GH_TOKEN."
        return
    }
    $status = & gh auth status
    if ($LASTEXITCODE -ne 0) {
        Write-Host "GitHub authentication is required. Run gh auth login, or put a repo-scoped token in .env as GH_TOKEN."
        exit 1
    }
    $status | Out-Host
}

function Get-DefaultBranch {
    $branch = git symbolic-ref refs/remotes/origin/HEAD 2>$null
    if ($branch) {
        return ($branch -replace "refs/remotes/origin/", "")
    }
    return "main"
}

function Add-LogEntry {
    param([string]$Label)
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss K"
    Add-Content -Path "playground-log.md" -Value "- $stamp - $Label"
}

function New-SandboxPr {
    param(
        [string]$Branch,
        [string]$Title,
        [string]$Body,
        [string]$LogLabel,
        [string]$CommitMessage
    )

    $base = Get-DefaultBranch
    git checkout $base
    git pull --ff-only
    git checkout -b $Branch
    Add-LogEntry $LogLabel
    git add playground-log.md
    git commit -m $CommitMessage
    git push -u origin $Branch
    $url = Run-Gh pr create --base $base --head $Branch --title $Title --body $Body
    Write-Host $url
    Run-Gh pr merge $Branch --merge --delete-branch --subject $Title
    git checkout $base
    git pull --ff-only
}

function Invoke-PullYolo {
    Require-Gh
    Require-CleanTree
    if (-not (Test-Path "playground-log.md")) {
        New-Item -ItemType File -Path "playground-log.md" | Out-Null
        git add playground-log.md
        git commit -m "Create playground log"
        git push
    }
    $suffix = Get-Date -Format "yyyyMMddHHmmss"
    New-SandboxPr "playground-pull-yolo-a-$suffix" "Playground PR 1" "Creates a sandbox PR for learning Pull Shark and YOLO workflows." "Pull/Yolo practice PR 1" "Add playground PR 1"
    New-SandboxPr "playground-pull-yolo-b-$suffix" "Playground PR 2" "Creates a second sandbox PR for learning Pull Shark workflows." "Pull/Yolo practice PR 2" "Add playground PR 2"
}

function Invoke-Pair {
    Require-Gh
    Require-CleanTree
    if (-not $CoAuthorName) {
        $CoAuthorName = Read-Host "Co-author GitHub name"
    }
    if (-not $CoAuthorEmail) {
        $CoAuthorEmail = Read-Host "Co-author GitHub email"
    }
    if (-not $CoAuthorName -or -not $CoAuthorEmail) {
        Write-Host "Co-author name and email are required."
        exit 1
    }

    $base = Get-DefaultBranch
    $suffix = Get-Date -Format "yyyyMMddHHmmss"
    $branch = "playground-pair-$suffix"
    git checkout $base
    git pull --ff-only
    git checkout -b $branch
    Add-LogEntry "Pair Extraordinaire practice with $CoAuthorName"
    git add playground-log.md
    git commit -m "Add co-authored playground entry`n`nCo-authored-by: $CoAuthorName <$CoAuthorEmail>"
    git push -u origin $branch
    Run-Gh pr create --base $base --head $branch --title "Add co-authored playground entry" --body "Creates a co-authored sandbox PR for learning Pair Extraordinaire."
    Run-Gh pr merge $branch --merge --delete-branch --subject "Add co-authored playground entry"
    git checkout $base
    git pull --ff-only
}

function Invoke-Quickdraw {
    Require-Gh
    $title = "Quickdraw playground issue $(Get-Date -Format yyyyMMddHHmmss)"
    $url = Run-Gh issue create --title $title --body "Created by Git Badges Playground and closed quickly for Quickdraw practice."
    Write-Host $url
    Run-Gh issue close $url --reason completed
}

function Show-Status {
    Require-Gh
    git status --short --branch
    git remote -v
    Run-Gh repo view --json "nameWithOwner,visibility,url"
}

function Show-Menu {
    Write-Host "Git Badges Playground"
    Write-Host "1. status"
    Write-Host "2. pull-yolo"
    Write-Host "3. pair"
    Write-Host "4. quickdraw"
    $choice = Read-Host "Choose a mode"
    switch ($choice) {
        "1" { Show-Status }
        "2" { Invoke-PullYolo }
        "3" { Invoke-Pair }
        "4" { Invoke-Quickdraw }
        default { Write-Host "Unknown choice." }
    }
}

Load-DotEnv
if (-not $CoAuthorName -and $env:COAUTHOR_NAME) { $CoAuthorName = $env:COAUTHOR_NAME }
if (-not $CoAuthorEmail -and $env:COAUTHOR_EMAIL) { $CoAuthorEmail = $env:COAUTHOR_EMAIL }

switch ($Mode) {
    "status" { Show-Status }
    "pull-yolo" { Invoke-PullYolo }
    "pair" { Invoke-Pair }
    "quickdraw" { Invoke-Quickdraw }
    default { Show-Menu }
}
