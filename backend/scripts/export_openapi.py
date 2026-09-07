"""Run from backend/: python scripts/export_openapi.py"""

import json
from pathlib import Path

from app.main import create_app

Path("openapi.json").write_text(json.dumps(create_app().openapi(), indent=2) + "\n")
