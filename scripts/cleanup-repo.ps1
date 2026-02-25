param(
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $RepoRoot

Write-Host "Repository root: $RepoRoot"
if ($Apply) {
  Write-Host "Mode: APPLY (matched paths will be deleted)"
} else {
  Write-Host "Mode: DRY-RUN (nothing will be deleted)"
}

$dirNames = @(
  "node_modules",
  "target",
  "build",
  "dist",
  ".venv",
  "__pycache__",
  "pycache",
  ".idea",
  ".vscode"
)

$filePatterns = @(
  "*.zip",
  "*.pt",
  "*.mp4",
  "*.avi",
  "*.mkv",
  "*.log"
)

$targets = New-Object System.Collections.Generic.List[string]

Get-ChildItem -Recurse -Directory -Force |
  Where-Object { $dirNames -contains $_.Name -and $_.FullName -notmatch "\\.git(\\|$)" } |
  ForEach-Object { $targets.Add($_.FullName) }

Get-ChildItem -Recurse -File -Force |
  Where-Object {
    $matchesPattern = $false
    foreach ($pattern in $filePatterns) {
      if ($_.Name -like $pattern) {
        $matchesPattern = $true
        break
      }
    }
    $matchesPattern -and $_.FullName -notmatch "\\.git(\\|$)"
  } |
  ForEach-Object { $targets.Add($_.FullName) }

if ($targets.Count -eq 0) {
  Write-Host "No matches found."
  exit 0
}

Write-Host "Matched paths:"
$targets | ForEach-Object { Write-Host "  $_" }

if (-not $Apply) {
  Write-Host "Dry-run complete. Run with -Apply to delete."
  exit 0
}

$targets | ForEach-Object {
  if (Test-Path $_) {
    Get-ChildItem -LiteralPath $_ -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
      $_.Attributes = $_.Attributes -band (-bnot [IO.FileAttributes]::ReadOnly)
    }
    Remove-Item -Recurse -Force $_
  }
}

Write-Host "Cleanup complete."
