@echo off
chcp 65001 >nul
title Aplicar atualização ORBE
echo.
echo ==========================================
echo       ATUALIZADOR DO APLICATIVO ORBE
echo ==========================================
echo.
node --version >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado. Instale o Node.js e tente novamente.
  pause
  exit /b 1
)
node "%~dp0apply-orbe.js"
if errorlevel 1 (
  echo.
  echo Nao foi possivel aplicar os arquivos.
  pause
  exit /b 1
)
echo.
echo Instalando dependencias compativeis com sua versao do Expo...
call npx expo install expo-local-authentication expo-secure-store expo-speech
if errorlevel 1 (
  echo.
  echo ATENCAO: os arquivos foram aplicados, mas a instalacao das dependencias falhou.
  echo Rode manualmente: npx expo install expo-local-authentication expo-secure-store expo-speech
  pause
  exit /b 1
)
echo.
echo Atualizacao aplicada. Iniciando o Expo...
call npx expo start --tunnel
pause
