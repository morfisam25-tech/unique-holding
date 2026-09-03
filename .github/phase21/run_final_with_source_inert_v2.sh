#!/usr/bin/env bash
set -euo pipefail
SRC="$GITHUB_WORKSPACE/qa21/.github/phase21/run_final_with_source_inert.sh"
FIXED='/tmp/run_final_with_source_inert_fixed.sh'
cp "$SRC" "$FIXED"
python3 - "$FIXED" <<'PYFIX'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()
old="python3 - \"$TMP\" <<'PY'\n"
new="python3 - \"$TMP\" <<'PY_PATCH'\n"
if old not in s:
    raise SystemExit('outer patch heredoc opener not found')
s=s.replace(old,new,1)
old_close='\np.write_text(s)\nPY\n\nbash "$TMP"'
new_close='\np.write_text(s)\nPY_PATCH\n\nbash "$TMP"'
if old_close not in s:
    raise SystemExit('outer patch heredoc closer not found')
s=s.replace(old_close,new_close,1)
p.write_text(s)
PYFIX
bash "$FIXED"
