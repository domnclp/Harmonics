$ErrorActionPreference = "Stop"

$logPath = Join-Path $PSScriptRoot "start-dev.log"
Set-Content -LiteralPath $logPath -Value "Harmonics dev runner started at $(Get-Date -Format o)"

function Write-Step {
  param([string] $Message)

  Write-Host $Message
  Add-Content -LiteralPath $logPath -Value $Message
}

function Stop-Port {
  param([int] $Port)

  $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    if ($connection.OwningProcess -and $connection.OwningProcess -ne $PID) {
      Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
}

function Start-DevProcess {
  param(
    [string] $Name,
    [string] $WorkingDirectory
  )

  Write-Step "Starting $Name..."
  $process = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $WorkingDirectory -NoNewWindow -PassThru
  Write-Step "$Name process id: $($process.Id)"
  return $process
}

function Wait-Port {
  param(
    [int] $Port,
    [int] $TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connection) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$apiDir = Join-Path $root "apps/api"
$webDir = Join-Path $root "apps/web"

Stop-Port 4000
Stop-Port 5173

$apiProcess = Start-DevProcess -Name "Harmonics API" -WorkingDirectory $apiDir
$webProcess = Start-DevProcess -Name "Harmonics Web" -WorkingDirectory $webDir

try {
Write-Step ""
Write-Step "Harmonics is running in this VS Code terminal."
Write-Step "Web: http://localhost:5173"
Write-Step "API: http://localhost:4000/health"
Write-Step ""
Write-Step "Press Ctrl+C to stop the runner."
Write-Step ""

  if (Wait-Port -Port 5173 -TimeoutSeconds 30) {
    Write-Step "Web ready: http://localhost:5173"
    Start-Process "http://localhost:5173"
  } else {
    Write-Step "Web did not become ready on http://localhost:5173 within 30 seconds."
  }

  while ($true) {
    if ($apiProcess.HasExited -or $webProcess.HasExited) {
      break
    }

    Start-Sleep -Milliseconds 500
  }
} finally {
  Stop-Process -Id $apiProcess.Id, $webProcess.Id -Force -ErrorAction SilentlyContinue
  Stop-Port 4000
  Stop-Port 5173
}
