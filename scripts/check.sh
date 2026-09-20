#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
site="$root/site"
fail=0
manifest="$site/assets/js/chapters.js"

if [[ ! -f "$manifest" ]]; then
  echo "MISS chapters.js"
  exit 1
fi

hrefs=$(grep -oE 'href:[[:space:]]*"[^"]+"' "$manifest" | sed -E 's/.*"([^"]+)"/\1/')
ids=$(grep -oE 'id:[[:space:]]*"[^"]+"' "$manifest" | sed -E 's/.*"([^"]+)"/\1/')

echo "== manifest files =="
for h in $hrefs; do
  if [[ -f "$site/$h" ]]; then
    echo "OK  $h"
  else
    echo "MISS $h"
    fail=1
  fi
done

echo "== required assets =="
need=(
  "$site/favicon.svg"
  "$site/assets/css/tokens.css"
  "$site/assets/css/layout.css"
  "$site/assets/css/components.css"
  "$site/assets/css/lab-motion.css"
  "$site/assets/css/guide.css"
  "$site/assets/js/chapters.js"
  "$site/assets/js/site.js"
  "$site/assets/js/motion.js"
  "$site/assets/js/guide.js"
  "$site/assets/js/patterns-lab.js"
  "$site/assets/js/drill-lab.js"
  "$site/assets/js/locks-lab.js"
  "$site/assets/js/cheat-lab.js"
  "$site/assets/js/reflect-lab.js"
  "$site/assets/js/checklist-lab.js"
  "$site/assets/js/memmodel-lab.js"
  "$site/assets/js/nethttp-lab.js"
  "$site/assets/js/shutdown-lab.js"
  "$site/assets/js/sql-lab.js"
  "$site/assets/js/observability-lab.js"
  "$site/assets/js/json-lab.js"
  "$site/assets/js/toolchain-lab.js"
  "$site/assets/js/atomic-lab.js"
  "$site/assets/js/embed-lab.js"
)
for f in "${need[@]}"; do
  if [[ -f "$f" ]]; then echo "OK  ${f#"$root"/}"; else echo "MISS ${f#"$root"/}"; fail=1; fi
done

echo "== per-page wiring =="
for h in $hrefs; do
  page="$site/$h"
  [[ -f "$page" ]] || continue
  dp=$(grep -oE 'data-page="[^"]+"' "$page" | head -1 | sed -E 's/data-page="([^"]+)"/\1/' || true)
  if [[ -n "$dp" ]] && echo "$ids" | grep -qx "$dp"; then
    echo "OK  $h data-page=$dp"
  else
    echo "FAIL $h data-page='$dp'"
    fail=1
  fi
  if grep -qE 'src="https?://|href="https?://' "$page"; then
    echo "FAIL $h remote asset URL"
    fail=1
  fi
  if grep -q 'assets/js/chapters.js' "$page" && grep -q 'assets/js/site.js' "$page" && grep -q 'assets/css/tokens.css' "$page"; then
    echo "OK  $h scripts/css"
  else
    echo "FAIL $h missing chapters/site/tokens link"
    fail=1
  fi
  # lab scripts if chapter html
  if [[ "$h" != "index.html" ]]; then
    if grep -q 'assets/js/.*-lab.js' "$page" || grep -q 'assets/js/.*lab.js' "$page"; then
      echo "OK  $h lab script"
    else
      echo "WARN $h no *-lab.js script"
    fi
  fi
done

echo "== node syntax =="
if command -v node >/dev/null 2>&1; then
  for js in "$site"/assets/js/*.js; do
    node --check "$js"
    echo "OK  node --check ${js#"$root"/}"
  done
else
  echo "SKIP node not installed"
fi

echo "== homepage cards vs manifest (study chapters) =="
study=$(echo "$ids" | grep -vx home || true)
for id in $study; do
  href=$(grep -oE "id:[[:space:]]*\"$id\",[[:space:]]*idx:[[:space:]]*\"[^\"]+\",[[:space:]]*href:[[:space:]]*\"[^\"]+\"" "$manifest" | sed -E 's/.*href:[[:space:]]*"([^"]+)"/\1/' || true)
  if [[ -z "$href" ]]; then
    href=$(python3 - <<PY
import re
t=open("$manifest",encoding="utf-8").read()
m=re.search(r'id:\s*"$id",[^}]*href:\s*"([^"]+)"', t)
print(m.group(1) if m else "")
PY
)
  fi
  if [[ -n "$href" ]] && grep -q "href=\"$href\"" "$site/index.html"; then
    echo "OK  home card $href"
  else
    echo "FAIL home missing card for $id ($href)"
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "check failed"
  exit 1
fi
echo "check passed"
