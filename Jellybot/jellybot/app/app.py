"""Command-line entry point retained for the existing proof of concept."""

import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

main = importlib.import_module("app.cli").main


if __name__ == "__main__":
    raise SystemExit(main())
