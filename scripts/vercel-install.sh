#!/bin/sh
set -eu
# Some Vercel builders supply npm_config_cache_dir, an unsupported npm key.
# Translate it to npm's supported cache key instead of suppressing warnings.
if [ -n "${npm_config_cache_dir:-}" ]; then
  export npm_config_cache="${npm_config_cache:-$npm_config_cache_dir}"
fi
if [ -n "${NPM_CONFIG_CACHE_DIR:-}" ]; then
  export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$NPM_CONFIG_CACHE_DIR}"
fi
unset npm_config_cache_dir NPM_CONFIG_CACHE_DIR
exec npm ci --no-audit --no-fund
