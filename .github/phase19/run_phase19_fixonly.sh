#!/usr/bin/env bash
set -euo pipefail
QA='../qa-harness/.github/phase19'
python3 "$QA/patch_run_phase19_final.py" "$QA/run_phase19.sh" /tmp/run_phase19-final.sh
bash /tmp/run_phase19-final.sh
