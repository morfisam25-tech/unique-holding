#!/usr/bin/env bash
set -euo pipefail
src="$(dirname "$0")/final_qa.cjs"
tmp=/tmp/phase23-final-qa-nocache.cjs
# The local review server correctly returns conditional 304 responses when Chromium reuses cache.
# Disable browser cache for every generic `p` page so smoke evidence is direct HTTP 200 evidence.
sed 's/const p=await browser.newPage();/const p=await browser.newPage();await p.setCacheEnabled(false);/g' "$src" > "$tmp"
node "$tmp"
