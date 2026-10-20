#!/usr/bin/env bash
# Usage: bash scripts/conectar-github.sh https://github.com/OWNER/REPO.git
set -euo pipefail
if [[ ${1:-} != https://github.com/* && ${1:-} != git@github.com:* ]]; then
  echo 'Informe uma URL válida de repositório GitHub (HTTPS ou SSH).' >&2
  exit 2
fi
cd "$(dirname "$0")/.."
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo 'Este diretório não é um repositório Git.' >&2; exit 2
fi
if [[ -n $(git status --porcelain) ]]; then
  echo 'Existem alterações não commitadas; faça commit antes de enviar.' >&2; exit 2
fi
if git remote get-url origin >/dev/null 2>&1; then
  remote=$(git remote get-url origin)
  if [[ "$remote" != "$1" ]]; then
    echo "origin já aponta para $remote; não vou alterar automaticamente." >&2
    exit 2
  fi
else
  git remote add origin "$1"
fi
# No force push: refuses unrelated history instead of silently overwriting GitHub.
git push -u origin main
