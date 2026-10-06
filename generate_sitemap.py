"""Compatibility command: generate the complete static site and current sitemap."""
from pathlib import Path
import subprocess

subprocess.run(["node", "scripts/build.cjs"], cwd=Path(__file__).resolve().parent, check=True)
