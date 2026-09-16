import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "api" / "python"))

import health  # noqa: F401
import elliott  # noqa: F401
import gann  # noqa: F401
import statistical  # noqa: F401
import forecast  # noqa: F401

print("python_handlers_import_ok")
