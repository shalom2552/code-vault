#Requires -Version 5.1
<#
.SYNOPSIS
    Windows setup for CodeVault.

.DESCRIPTION
    Patches docker-compose.yml to remove Linux-only cap_add/devices blocks
    and sets TAILSCALE=0, then starts the container.
    Run this once on Windows instead of editing docker-compose.yml manually.
#>

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "=== CodeVault Windows Setup ===" -ForegroundColor Cyan
Write-Host "Patches docker-compose.yml for Docker Desktop (removes /dev/net/tun requirement)"
Write-Host "and starts the container."
Write-Host ""

# Verify Docker is running
try {
    docker info 2>&1 | Out-Null
} catch {
    Write-Host "ERROR: Docker is not running. Start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

$composeFile = Join-Path $PSScriptRoot "docker-compose.yml"
if (-not (Test-Path $composeFile)) {
    Write-Host "ERROR: docker-compose.yml not found at $composeFile" -ForegroundColor Red
    exit 1
}

$lines = Get-Content $composeFile
$out = [System.Collections.Generic.List[string]]::new()
$skip = $false

foreach ($line in $lines) {
    # Remove cap_add block (the block header and its single child - NET_ADMIN)
    if ($line -match '^\s+cap_add:\s*$') {
        $skip = $true
        continue
    }
    if ($skip -and $line -match '^\s+-\s+NET_ADMIN') {
        continue
    }
    # Remove devices block
    if ($line -match '^\s+devices:\s*$') {
        $skip = $true
        continue
    }
    if ($skip -and $line -match '/dev/net/tun') {
        continue
    }
    # End of a skipped block when we hit something at the same or higher indent level
    if ($skip -and $line -match '^\s{4}\S') {
        $skip = $false
    }

    # Uncomment TAILSCALE=0
    $patched = $line -replace '^\s*#\s*(- TAILSCALE=0).*$', '      - TAILSCALE=0'
    $out.Add($patched)
}

[System.IO.File]::WriteAllLines($composeFile, $out)
Write-Host "Patched docker-compose.yml." -ForegroundColor Green

Write-Host "Running: docker compose up --build" -ForegroundColor Cyan
docker compose up --build

Write-Host ""
Write-Host "CodeVault is running at http://localhost:5174" -ForegroundColor Green
