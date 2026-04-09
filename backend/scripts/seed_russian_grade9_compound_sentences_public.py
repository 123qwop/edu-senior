"""
Публичный набор «Сложные предложения — 9 класс» (русский язык).

Запуск из каталога `edu-senior/backend`:

  python -m scripts.seed_russian_grade9_compound_sentences_public
  python -m scripts.seed_russian_grade9_compound_sentences_public --dry-run
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    json_path = Path(__file__).resolve().parent / "data" / "russian_grade9_compound_sentences_public.json"
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
