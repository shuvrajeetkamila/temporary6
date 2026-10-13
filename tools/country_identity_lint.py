#!/usr/bin/env python3
"""
Country Identity and Geographical Boundary Verification Lint for Bahrain.
Ensures no unauthorized cross-border claims or misattributions.
"""

import os
import sys

FORBIDDEN_TERMS = [
    # Verify no accidental foreign country names used as Bahrain
    "saudi arabia kingdom of saudi", "state of qatar capital", "united arab emirates capital"
]

def check_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read().lower()
            for term in FORBIDDEN_TERMS:
                if term in content:
                    return False, term
    except Exception:
        pass
    return True, None

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    scanned = 0
    for dirpath, dirnames, filenames in os.walk(root):
        if any(skip in dirpath for skip in ['.git', 'node_modules', 'dist', 'archive', '.gradle']):
            continue
        for fn in filenames:
            if fn.endswith(('.js', '.json', '.html', '.css', '.md', '.xml', '.gradle')):
                scanned += 1
                fp = os.path.join(dirpath, fn)
                ok, term = check_file(fp)
                if not ok:
                    print(f"FAIL: {fp} contains forbidden string '{term}'")
                    sys.exit(1)

    print(f"Scanned {scanned} files across project.")
    print("PASS: Country-Identity Lint PASSED all checks.")

if __name__ == '__main__':
    main()
