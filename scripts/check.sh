#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
site="$root/site"
fail=0

need=(
  "$site/index.html"
  "$site/gmp.html"
  "$site/channel.html"
  "$site/gc.html"
  "$site/favicon.svg"
  "$site/assets/css/tokens.css"
  "$site/assets/css/layout.css"
  "$site/assets/css/components.css"
  "$site/assets/css/lab-motion.css"
  "$site/assets/css/guide.css"
  "$site/assets/js/site.js"
  "$site/assets/js/motion.js"
  "$site/assets/js/guide.js"
  "$site/assets/js/gmp-lab.js"
  "$site/assets/js/channel-lab.js"
  "$site/assets/js/gc-lab.js"
)

echo "== structure =="
for f in "${need[@]}"; do
  if [[ -f "$f" ]]; then
    echo "OK  ${f#"$root"/}"
  else
    echo "MISS ${f#"$root"/}"
    fail=1
  fi
done

echo "== relative assets in HTML =="
for page in index.html gmp.html channel.html gc.html; do
  if grep -E 'src="https?://|href="https?://' "$site/$page" >/dev/null 2>&1; then
    echo "FAIL $page references remote asset URL"
    fail=1
  else
    echo "OK  $page no remote asset refs"
  fi
  if grep -q 'assets/css/tokens.css' "$site/$page" && grep -q 'assets/js/site.js' "$site/$page"; then
    echo "OK  $page links assets/"
  else
    echo "FAIL $page missing assets/ links"
    fail=1
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

if [[ "$fail" -ne 0 ]]; then
  echo "check failed"
  exit 1
fi
echo "check passed"
