<#
.SYNOPSIS
  Installs system libraries and prerequisites for Manim on Windows.

.DESCRIPTION
  Checks for and installs FFmpeg, Cairo graphics dependencies, MiKTeX (LaTeX),
  and the Manim Community Edition Python packages via winget and pip.

.PARAMETER CheckOnly
  Only checks whether prerequisites are present without modifying the system.
#>

param(
    [switch]$CheckOnly = $false
)

$ErrorActionPreference = "Continue"

Write-Host "=== Reel Engine: Manim System Dependency Setup ===" -ForegroundColor Cyan

function Test-CommandAvailable {
    param([string]$cmd)
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    return $null -ne $found
}

$hasWinget = Test-CommandAvailable "winget"
$hasPython = Test-CommandAvailable "python"
$hasFFmpeg = Test-CommandAvailable "ffmpeg"
$hasManim = $false

if ($hasPython) {
    $res = python -c "import manim; print(manim.__version__)" 2>$null
    if ($LASTEXITCODE -eq 0) { $hasManim = $true }
}

Write-Host "1. Windows Package Manager (winget): $(if ($hasWinget) { 'INSTALLED' } else { 'MISSING' })"
Write-Host "2. Python 3.11+:                     $(if ($hasPython) { 'INSTALLED' } else { 'MISSING' })"
Write-Host "3. FFmpeg:                           $(if ($hasFFmpeg) { 'INSTALLED' } else { 'BUNDLED in Reel Engine' })"
Write-Host "4. Manim Python Package:             $(if ($hasManim) { 'INSTALLED' } else { 'NOT INSTALLED' })"

if ($CheckOnly) {
    Write-Host "`nCheck complete. To run installation, execute without -CheckOnly." -ForegroundColor Yellow
    exit 0
}

if (-not $hasWinget) {
    Write-Warning "winget is required to install system packages on Windows."
    exit 1
}

# 1. Install FFmpeg if not found on system PATH
if (-not $hasFFmpeg) {
    Write-Host "`nInstalling FFmpeg via winget..." -ForegroundColor Cyan
    winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
}

# 2. Install MiKTeX for LaTeX formula rendering
Write-Host "`nChecking MiKTeX / LaTeX installation..." -ForegroundColor Cyan
$hasLatex = Test-CommandAvailable "latex"
if (-not $hasLatex) {
    Write-Host "Installing MiKTeX via winget (may take a few minutes)..." -ForegroundColor Cyan
    winget install --id MiKTeX.MiKTeX -e --accept-source-agreements --accept-package-agreements
} else {
    Write-Host "LaTeX already installed." -ForegroundColor Green
}

# 3. Install Python Manim & dependencies
Write-Host "`nInstalling Manim Python packages..." -ForegroundColor Cyan
python -m pip install --upgrade pip
python -m pip install manim pycairo numpy scipy

Write-Host "`n=== Manim Setup Complete ===" -ForegroundColor Green
python -m manim --version
