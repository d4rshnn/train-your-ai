# Serves the built app (dist/) on http://127.0.0.1:<port>/ . Needs nothing but Windows PowerShell 5.1: no Node, no network.
# Loopback only, and every response carries a Content-Security-Policy that forbids any request to another host,
# so the page physically cannot reach the internet even if some future change tried to.
param(
  [string]$Root = (Join-Path $PSScriptRoot '..\dist'),
  [int]$Port = 4173
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path -LiteralPath $Root).Path
$pidFile = Join-Path $env:TEMP 'tya-server.pid'
$PID | Set-Content -LiteralPath $pidFile

$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json'; '.map' = 'application/json'
  '.webp' = 'image/webp'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
  '.woff2' = 'font/woff2'; '.woff' = 'font/woff'; '.txt' = 'text/plain; charset=utf-8'; '.mp4' = 'video/mp4'
}
$csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
try { $listener.Start() } catch { Write-Error "Cannot listen on port $Port (is another copy already running?): $_"; exit 2 }
Write-Host "Train Your AI is being served from $Root on http://127.0.0.1:$Port/ (close this window to stop)"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $Root ($path.TrimStart('/') -replace '/', '\')))
    $inside = $full.StartsWith($Root + '\', [StringComparison]::OrdinalIgnoreCase)
    if (-not $inside -or -not (Test-Path -LiteralPath $full -PathType Leaf) -or $ctx.Request.HttpMethod -notin @('GET', 'HEAD')) {
      $res.StatusCode = 404
      $bytes = [Text.Encoding]::UTF8.GetBytes('Not found')
    } else {
      $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      # the page itself is never cached (so a rebuilt dist shows up at once); hashed assets can be
      $res.Headers['Cache-Control'] = if ($ext -eq '.html') { 'no-store' } else { 'public, max-age=31536000, immutable' }
      $bytes = [IO.File]::ReadAllBytes($full)
    }
    $res.Headers['Content-Security-Policy'] = $csp
    $res.Headers['X-Content-Type-Options'] = 'nosniff'
    $res.Headers['Referrer-Policy'] = 'no-referrer'
    $res.ContentLength64 = $bytes.Length
    if ($ctx.Request.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
  } catch {
    try { $res.StatusCode = 500 } catch {}
  } finally {
    try { $res.Close() } catch {}
  }
}
