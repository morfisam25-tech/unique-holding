#!/usr/bin/env bash
set -euo pipefail
QA='../qa-harness/.github/phase19'
# Final Phase 19 QA architecture: source graph vs runtime graph + generic deterministic/stochastic adjudication.
python3 "$QA/patch_run_phase19_final.py" "$QA/run_phase19.sh" /tmp/run_phase19-stage1.sh
python3 "$QA/patch_run_phase19_architecture.py" /tmp/run_phase19-stage1.sh /tmp/run_phase19-stage2.sh
python3 "$QA/patch_run_phase19_source_runtime.py" /tmp/run_phase19-stage2.sh /tmp/run_phase19-final.sh
PYTHONPATH="$QA" python3 "$QA/test_performance_classifier.py" | tee /tmp/phase19-classifier-fixtures.json
bash /tmp/run_phase19-final.sh
