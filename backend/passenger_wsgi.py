import os
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent

if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "formulas_backend.settings")

from formulas_backend.wsgi import application  # noqa: E402
