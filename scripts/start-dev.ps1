# start-dev.ps1 — Launch all Pulse dev servers
#
# Prerequisites:
#   1. Install LiveKit server binary:
#      winget install LiveKit.LiveKit
#      OR download from https://github.com/livekit/livekit/releases
#      (grab livekit_windows_amd64.zip, extract livekit-server.exe, place on PATH)
#
#   2. Ensure .NET 8 SDK is installed for Pulse.Server
#   3. Ensure Node.js 18+ is installed for pulse-client
#
# Usage:
#   .\scripts\start-dev.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot | Split-Path -Parent

# Terminal 1 — LiveKit SFU (port 7880)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; & '$root\livekit-server.exe' --config '$root\livekit.yaml'" -WindowStyle Normal

# Terminal 2 — C# backend (port 5104)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\Pulse.Server'; dotnet run" -WindowStyle Normal

# Give servers a moment to start
Start-Sleep -Seconds 2

# Terminal 3 — Electron/Vite client
Set-Location "$root\pulse-client"
npm run dev
