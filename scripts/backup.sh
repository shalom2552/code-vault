#!/usr/bin/env sh
# Usage: BACKUP_DIR=/path/to/backups ./scripts/backup.sh
# Creates a timestamped tarball of the data/ directory.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
DATA_DIR="${DATA_DIR:-$ROOT/data}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/codevault-$TIMESTAMP.tar.gz"

tar -czf "$OUT" -C "$ROOT" data
echo "Backup written to $OUT"
