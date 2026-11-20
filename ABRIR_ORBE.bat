@echo off
setlocal
title Abrir ORBE - Expo Go

echo.
echo ==========================================
echo          INICIANDO O ORBE
echo ==========================================
echo.
echo Procurando a pasta do aplicativo...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$root='%~dp0';" ^
  "$pkg=Get-ChildItem -LiteralPath $root -Filter package.json -File -Recurse -ErrorAction SilentlyContinue | Where-Object { (Test-Path (Join-Path $_.DirectoryName 'app.json')) -and (Test-Path (Join-Path $_.DirectoryName 'src\app')) } | Select-Object -First 1;" ^
  "if (-not $pkg) { Write-Host 'Nao encontrei o projeto Expo (package.json + app.json + src\app).' -ForegroundColor Red; Write-Host 'Coloque este arquivo na pasta Downloads\orbe_react-main e tente novamente.'; Read-Host 'Pressione Enter para fechar'; exit 1 };" ^
  "Set-Location -LiteralPath $pkg.DirectoryName;" ^
  "$env:NODE_OPTIONS='--use-system-ca';" ^
  "Write-Host ('Projeto encontrado em: ' + $pkg.DirectoryName) -ForegroundColor Green;" ^
  "Write-Host 'Iniciando Expo com tunel...';" ^
  "& npx.cmd expo start --tunnel --go"

echo.
echo O processo do Expo foi encerrado.
pause
