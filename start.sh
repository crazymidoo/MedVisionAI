#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

python -m pip install -r requirements.txt

cd "$ROOT_DIR/Cartella_Bone_Fractures"
python -m uvicorn mesh_api:app --host 127.0.0.1 --port 8000 &
MESH_API_PID=$!
trap 'kill "$MESH_API_PID" 2>/dev/null || true' EXIT INT TERM

python app.py
