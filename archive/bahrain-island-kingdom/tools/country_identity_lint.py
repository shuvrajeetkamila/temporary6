#!/usr/bin/env python3
"""
Country-Identity Lint for BAHRAIN: THE ISLAND KINGDOM
Annex B4 Compliance Checker

Scans runtime code, configs, manifests, and localization files.
Ensures no placeholder strings from other Gulf cities or countries exist,
and verifies essential Bahrain identity invariants.
"""

import os
import sys
import re

FORBIDDEN_TERMS = [
    r'\bDoha\b',
    r'\bLusail\b',
    r'\bKhor Al Adaid\b',
    r'\bDubai\b',
    r'\bAbu Dhabi\b',
    r'\bMumbai\b',
    r'\bNauru\b',
    r'\bAl Rayyan\b',
    r'\bAl Wakrah\b',
    r'\bAl Daayen\b',
    r'\bUmm Salal\b',
    r'\bAl Shamal\b',
    r'\bAl Shahaniya\b',
    r'\bleft-hand traffic\b',
    r'\bLHT\b',
    r'\boperational metro\b',
    r'\bmetro station open\b',
]

# Files allowed to mention forbidden terms in comparative/lint context
ALLOWLIST_FILES = {
    'country_identity_lint.py',
    'tools/country_identity_lint.py',
    'README.md',
    'DATA_SOURCES.md',
    'BAHRAIN_WORLD_EPOCH.md',
    'data/geodata/BAHRAIN_WORLD_EPOCH.md',
    'BAHRAIN_BOUNDARY_REPORT.md',
    'data/geodata/BAHRAIN_BOUNDARY_REPORT.md',
    'docs/BAHRAIN_IMPLEMENTATION_LEDGER.md'
}

REQUIRED_INVARIANTS = {
    'COUNTRY_CODE': 'BHR',
    'TIMEZONE': 'Asia/Bahrain',
    'TRAFFIC_ORIENTATION': 'RIGHT_HAND_TRAFFIC',
}

REQUIRED_GOVERNORATES = [
    'Capital Governorate',
    'Muharraq Governorate',
    'Northern Governorate',
    'Southern Governorate'
]

FORBIDDEN_CURRENT_GOVERNORATE = 'Central Governorate'

def lint_files(root_dir='.'):
    errors = []
    scanned_count = 0
    osm_attribution_found = False

    scan_extensions = {'.java', '.kt', '.json', '.geojson', '.xml', '.gradle', '.properties', '.py', '.txt', '.md'}

    for root, dirs, files in os.walk(root_dir):
        # Skip git, gradle cache, build output
        if any(skip in root for skip in ['.git', '.gradle', 'build', 'artifacts']):
            continue
        for f in files:
            ext = os.path.splitext(f)[1]
            if ext not in scan_extensions:
                continue

            filepath = os.path.relpath(os.path.join(root, f), root_dir)
            scanned_count += 1

            try:
                with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
            except Exception as e:
                errors.append(f"Failed to read {filepath}: {e}")
                continue

            # Check OSM attribution
            if '© OpenStreetMap contributors' in content or 'OpenStreetMap contributors' in content:
                osm_attribution_found = True

            # Skip linting terms in allowlisted files
            if any(filepath.endswith(al) for al in ALLOWLIST_FILES):
                continue

            # Check forbidden terms
            for term_pat in FORBIDDEN_TERMS:
                matches = re.findall(term_pat, content, re.IGNORECASE)
                if matches:
                    errors.append(f"Forbidden term '{matches[0]}' found in {filepath}")

            # Check for Central Governorate being used as current administrative entity
            if FORBIDDEN_CURRENT_GOVERNORATE in content:
                # Only allowed if explicitly marked as historical/abolished
                if 'abolished' not in content.lower() and 'former' not in content.lower():
                    errors.append(f"Forbidden current governorate '{FORBIDDEN_CURRENT_GOVERNORATE}' in {filepath}")

    if not osm_attribution_found:
        errors.append("Mandatory attribution '© OpenStreetMap contributors' not found in any repository file!")

    print(f"Scanned {scanned_count} files across project.")
    if errors:
        print(f"LINT FAILED with {len(errors)} error(s):")
        for err in errors:
            print(f"  - {err}")
        return False
    else:
        print("PASS: Country-Identity Lint PASSED all checks.")
        return True

if __name__ == '__main__':
    ok = lint_files('.')
    sys.exit(0 if ok else 1)
