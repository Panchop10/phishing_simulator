#!/usr/bin/env bash
# Instala Docker en una instancia EC2 nueva (Amazon Linux 2023 o Ubuntu) y
# arranca la plataforma. Ejecuta con sudo si es necesario.
set -euo pipefail

if command -v docker >/dev/null 2>&1; then
  echo "Docker ya está instalado."
else
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y docker
    sudo systemctl enable --now docker
  elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-plugin
    sudo systemctl enable --now docker
  else
    echo "Gestor de paquetes no reconocido. Instala Docker manualmente." >&2
    exit 1
  fi
  sudo usermod -aG docker "$USER" || true
  echo "Docker instalado. Puede que necesites cerrar sesión y volver a entrar para usar docker sin sudo."
fi

cd "$(dirname "$0")/.."
./start.sh
