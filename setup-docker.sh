#!/usr/bin/env bash
# Convenience wrapper — delegates to setup.sh --docker
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
exec bash "${SCRIPT_DIR}/setup.sh" --docker
