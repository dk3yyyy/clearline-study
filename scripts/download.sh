#!/usr/bin/env bash
# Re-runnable source acquisition. This script only writes to sources/.
# Usage: ./scripts/download.sh [--check-only]
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
CHECK_ONLY=0
[ "${1:-}" = "--check-only" ] && CHECK_ONLY=1
mkdir -p sources/00-sia-specs sources/01-sia-regulatory sources/02-law sources/03-health-safety-fire

urls=(
"https://assets.publishing.service.gov.uk/media/6061dd69e90e072d8f8b8638/sia-common-specification-2021.pdf"
"https://assets.publishing.service.gov.uk/media/6061f28d8fa8f55b6fae563f/sia-ds-specification-2021.pdf"
"https://assets.publishing.service.gov.uk/media/63ef6d8f8fa8f5612b499c2c/door-supervisor-final-unit-content.pdf"
"https://assets.publishing.service.gov.uk/media/6061dd35d3bf7f5ce4f581ba/sia-conflict-management-specification-2021.pdf"
"https://assets.publishing.service.gov.uk/media/6061f2bee90e072d9d0d4214/sia-physical-intervention-specification-2021.pdf"
"https://assets.publishing.service.gov.uk/media/6061f318e90e072d97f87650/sia-sg-specification-2021.pdf"
"https://assets.publishing.service.gov.uk/media/6061f2e8d3bf7f5ce74c29f3/sia-cctv-specification-2021.pdf"
"https://assets.publishing.service.gov.uk/media/62389474e90e0779a0082628/sia-cp-specification-2022.pdf"
"https://assets.publishing.service.gov.uk/media/6238955a8fa8f540eb4c12f6/sia-cp-physical-intervention-specification-2022.pdf"
"https://assets.publishing.service.gov.uk/media/623895ace90e0779a4d55815/sia-cp-ds-responsiblities-specification-2022.pdf"
"https://assets.publishing.service.gov.uk/media/6061dc888fa8f55b67fb3612/sia-cvit-specification-2021.pdf"
"https://assets.publishing.service.gov.uk/media/670f919e3b919067bb483246/sia-ds-refresher-specification-2024.pdf"
"https://assets.publishing.service.gov.uk/media/670f91c1080bdf716392f438/sia-sg-refresher-specification-2024.pdf"
"https://assets.publishing.service.gov.uk/media/68add0a9960e2d135b4c8e3c/sia-cp-physical-intervention-refresher-specification-2025.pdf"
"https://assets.publishing.service.gov.uk/media/5f857671d3bf7f6b99980884/sia-vi-specification.pdf"
"https://assets.publishing.service.gov.uk/media/62457e3ed3bf7f32a93d3bb2/sia-get-training.pdf"
"https://assets.publishing.service.gov.uk/media/6929deb7b3b9afff34e9626b/sia-get-licensed.pdf"
)

report="sources/DOWNLOAD_REPORT.latest.md"
printf '# Latest download check\n\n' > "$report"
for url in "${urls[@]}"; do
  name="${url##*/}"
  code="$(curl -sIL -o /dev/null -w '%{http_code}' "$url" || true)"
  printf '%s %s\n' "$code" "$name"
  printf -- '- %s `%s`\n' "$code" "$name" >> "$report"
  if [ "$CHECK_ONLY" -eq 0 ] && [ "$code" = "200" ]; then
    curl -L --retry 3 --fail --silent --show-error -A "Mozilla/5.0" "$url" -o "sources/00-sia-specs/$name" || printf 'download failed: %s\n' "$name"
    file "sources/00-sia-specs/$name" | grep -qi 'pdf' || printf 'not a PDF: %s\n' "$name"
    if command -v pdftotext >/dev/null 2>&1; then
      pdftotext -layout "sources/00-sia-specs/$name" "sources/00-sia-specs/${name%.pdf}.txt" || true
    fi
  fi
done
printf '\nWrote %s\n' "$report"
