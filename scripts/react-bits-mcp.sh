#!/usr/bin/env bash
set -euo pipefail

# Resolve o monorepo independentemente do diretório do cliente MCP.
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

# O registry está no workspace administrativo. Não instalar tooling no host.
# Não usar -t: stdout é reservado ao protocolo MCP stdio.
exec docker run --rm -i \
  --mount "type=bind,source=${project_root},target=/app" \
  --workdir /app \
  node:26.13.1-bookworm-slim \
  npx --yes shadcn@latest mcp
