"""
Seed the public study set \"Limits — Calculus I\" from scripts/data/limits_calculus1_public.json.

Run from `edu-senior/backend`:

  python -m scripts.seed_limits_calculus1_public
  python -m scripts.seed_limits_calculus1_public --dry-run
  CREATOR_ID=14 python -m scripts.seed_limits_calculus1_public

This is a thin wrapper around `scripts.seed_public_study_set` with the JSON path preset.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    json_path = Path(__file__).resolve().parent / "data" / "limits_calculus1_public.json"
    cmd = [
        sys.executable,
        "-m",
        "scripts.seed_public_study_set",
        "--json",
        str(json_path),
        *sys.argv[1:],
    ]
    raise SystemExit(subprocess.call(cmd, cwd=str(backend_root)))


if __name__ == "__main__":
    main()
