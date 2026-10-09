# Deploy de NeuroExamen a HostGator (sh006.hostgator.net).
#
#   .\scripts\deploy-hostgator.ps1            # deploy completo (backend + frontend)
#   .\scripts\deploy-hostgator.ps1 -Backend   # solo PHP
#   .\scripts\deploy-hostgator.ps1 -Frontend  # solo dist/
#
# Cada llamada remota corre con BatchMode (sin prompts de contraseña que
# bloqueen la sesión) y timeout duro por intento, con reintentos moderados:
# si el host se cae, reintenta y sigue, nunca se queda colgado.
param(
  [switch]$Backend,
  [switch]$Frontend,
  [int]$Attempts = 3,
  [int]$DelaySec = 5,
  [int]$SshTimeoutSec = 120
)

$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent $PSScriptRoot
$Host_ = 'matiasf6@sh006.hostgator.net'
$Key = Join-Path $env:USERPROFILE '.ssh\neuroma_hostgator'
$RemoteRoot = '~/pedidos.examenes-neuro.com/public'
$RemoteRootAbs = '/home1/matiasf6/pedidos.examenes-neuro.com/public'
$Ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$Failed = @()

function Invoke-Exe {
  param([string]$File, [string[]]$ArgList, [int]$TimeoutSec, [int]$Try)
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $File
  $psi.Arguments = ($ArgList -join ' ')
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $p = [Diagnostics.Process]::Start($psi)
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  $timedOut = -not $p.WaitForExit($TimeoutSec * 1000)
  if ($timedOut) { try { $p.Kill() } catch {}; $p.WaitForExit(5000) }
  [PSCustomObject]@{
    ExitCode = $(if ($timedOut) { -9 } else { $p.ExitCode })
    TimedOut = $timedOut
    StdOut   = $stdout
    StdErr   = $stderr
    Try      = $Try
  }
}

function Invoke-Remote {
  <# ssh no interactiva: reintentos con timeout duro #>
  param([string]$Command, [int]$TimeoutSec = 0)
  if (-not $TimeoutSec) { $TimeoutSec = $SshTimeoutSec }
  $common = @('-i', "`"$Key`"",
    '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15',
    '-o', 'ServerAliveInterval=5', '-o', 'ServerAliveCountMax=3',
    '-o', 'StrictHostKeyChecking=accept-new', $Host_)
  for ($i = 1; $i -le $Attempts; $i++) {
    $esc = ($Command -replace '"', '\"')
    $r = Invoke-Exe -File 'ssh' -ArgList ($common + @("`"$esc`"")) -TimeoutSec $TimeoutSec -Try $i
    if ($r.TimedOut) { Write-Host "  [ssh intento $i] TIMEOUT tras ${TimeoutSec}s" -ForegroundColor Yellow }
    elseif ($r.ExitCode -eq 0) { return $r }
    else { Write-Host "  [ssh intento $i] exit=$($r.ExitCode): $($r.StdErr.Trim())" -ForegroundColor Yellow }
    if ($i -lt $Attempts) { Start-Sleep -Seconds $DelaySec }
  }
  $script:Failed += "ssh: $Command"
  return $r
}

function Copy-ToRemote {
  <# scp no interactiva: reintentos con timeout duro #>
  param([string[]]$Local, [string]$RemotePath, [string]$Label, [int]$TimeoutSec = 300)
  $common = @('-i', "`"$Key`"",
    '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15',
    '-o', 'ServerAliveInterval=5', '-o', 'ServerAliveCountMax=3',
    '-o', 'StrictHostKeyChecking=accept-new')
  $dest = "${Host_}:$RemotePath"
  for ($i = 1; $i -le $Attempts; $i++) {
    $r = Invoke-Exe -File 'scp' -ArgList ($common + $Local + @($dest)) -TimeoutSec $TimeoutSec -Try $i
    if ($r.TimedOut) { Write-Host "  [scp $Label intento $i] TIMEOUT" -ForegroundColor Yellow }
    elseif ($r.ExitCode -eq 0) { Write-Host "  [scp $Label] OK (intento $i)" -ForegroundColor Green; return $true }
    else { Write-Host "  [scp $Label intento $i] exit=$($r.ExitCode): $($r.StdErr.Trim())" -ForegroundColor Yellow }
    if ($i -lt $Attempts) { Start-Sleep -Seconds $DelaySec }
  }
  $script:Failed += "scp: $Label"
  return $false
}

if (-not $Backend -and -not $Frontend) { $Backend = $true; $Frontend = $true }
Set-Location $Repo

Write-Host "== Preflight ==" -ForegroundColor Cyan
$r = Invoke-Remote 'echo CONNECTED; hostname'
if ($r.ExitCode -ne 0) { Write-Error 'Sin SSH tras los reintentos: aborto.' }
Write-Host "  SSH OK: $($r.StdOut.Trim())"

if ($Backend) {
  Write-Host "== Backend (server-php -> $RemoteRoot/api) ==" -ForegroundColor Cyan
  $files = @(
    @{ Local = 'server-php/lib/laudoWatermarkPdf.php'; Remote = "$RemoteRoot/api/lib/laudoWatermarkPdf.php"; RemoteAbs = "$RemoteRootAbs/api/lib/laudoWatermarkPdf.php"; Backup = $true },
    @{ Local = 'server-php/lib/signing.php'; Remote = "$RemoteRoot/api/lib/signing.php"; RemoteAbs = "$RemoteRootAbs/api/lib/signing.php"; Backup = $true },
    @{ Local = 'server-php/api/laudos/signed-pdf.php'; Remote = "$RemoteRoot/api/api/laudos/signed-pdf.php"; RemoteAbs = "$RemoteRootAbs/api/api/laudos/signed-pdf.php"; Backup = $true }
  )
  foreach ($f in $files) {
    if (-not (Test-Path $f.Local)) { Write-Host "  FALTA local: $($f.Local)" -ForegroundColor Red; $script:Failed += "missing $($f.Local)"; continue }
    if ($f.Backup) {
      $bak = "$($f.RemoteAbs).bak.deploy_$Ts"
      Invoke-Remote "cp -f '$($f.RemoteAbs)' '$bak' 2>/dev/null || echo 'sin previo (archivo nuevo)'" | Out-Null
    }
    $null = Copy-ToRemote -Local @((Resolve-Path $f.Local).Path) -RemotePath $f.Remote -Label $f.Local
  }

  # Verificación remota: md5 igual al local + php -l (sintaxis) en el servidor
  $md5Local = @{}
  foreach ($f in $files) {
    if (Test-Path $f.Local) { $md5Local[$f.RemoteAbs] = (Get-FileHash -Algorithm MD5 $f.Local).Hash.ToLower() }
  }
  $list = ($md5Local.Keys | ForEach-Object { "'$_'" }) -join ' '
  $remote = Invoke-Remote "md5sum $list 2>&1; echo '--- php -l ---'; for f in $list; do /usr/local/bin/php -l `$f 2>&1 | sed 's#/home1/matiasf6/pedidos.examenes-neuro.com/public/api/##'; done"
  Write-Host $remote.StdOut
  foreach ($line in ($remote.StdOut -split "`n")) {
    if ($line -match '^([0-9a-f]{32})\s+(.+)$') {
      $hash = $Matches[1].Trim(); $path = $Matches[2].Trim()
      $want = $md5Local[$path]
      if ($want -and $want -ne $hash) { Write-Host "  MD5 DISTINTO: $path" -ForegroundColor Red; $script:Failed += "md5 $path" }
      elseif ($want) { Write-Host "  md5 OK: $path" -ForegroundColor Green }
    }
    if ($line -match 'error|Fatal') { $script:Failed += "php -l: $line" }
  }
}

if ($Frontend) {
  Write-Host "== Frontend (dist -> $RemoteRoot) ==" -ForegroundColor Cyan
  if (-not (Test-Path 'dist/index.html')) { Write-Error 'No existe dist/index.html: corre npm run build.' }
  $assets = @(Get-ChildItem 'dist/assets' -File | ForEach-Object { $_.FullName })
  Write-Host "  assets locales: $($assets.Count)"
  # 1) assets primero (hashes nuevos) para que el index viejo siga válido
  $null = Copy-ToRemote -Local $assets -RemotePath "$RemoteRoot/assets/" -Label 'dist/assets/*' -TimeoutSec 600
  # 2) respaldo + index.html al final
  Invoke-Remote "cp -f '$RemoteRootAbs/index.html' '$RemoteRootAbs/index.html.bak.deploy_$Ts' 2>/dev/null || echo 'sin index previo'" | Out-Null
  $null = Copy-ToRemote -Local @((Resolve-Path 'dist/index.html').Path) -RemotePath "$RemoteRoot/index.html" -Label 'dist/index.html'
}

Write-Host "== Verificación en producción ==" -ForegroundColor Cyan
$index = curl.exe -sS -o NUL -w '%{http_code}' --max-time 30 https://pedidos.examenes-neuro.com/
Write-Host "  GET / -> $index"
$newAsset = (Select-String -Path 'dist/index.html' -Pattern '/assets/[^"]+\.js' | Select-Object -First 1).Matches[0].Value
$assetCode = curl.exe -sS -o NUL -w '%{http_code}' --max-time 30 "https://pedidos.examenes-neuro.com$newAsset"
Write-Host "  GET $newAsset -> $assetCode"
$api = curl.exe -sS -o NUL -w '%{http_code}' --max-time 30 https://pedidos.examenes-neuro.com/api/laudos
Write-Host "  GET /api/laudos -> $api"
if ($index -ne '200') { $script:Failed += "index HTTP $index" }
if ($assetCode -ne '200') { $script:Failed += "asset HTTP $assetCode" }
if ($api -notin @('200', '401')) { $script:Failed += "api HTTP $api" }

Write-Host ''
if ($Failed.Count -eq 0) {
  Write-Host "== DEPLOY OK (ts $Ts) ==" -ForegroundColor Green
} else {
  Write-Host "== DEPLOY CON PROBLEMAS ==" -ForegroundColor Red
  $Failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}
