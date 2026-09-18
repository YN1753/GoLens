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
  "$site/slice-map.html"
  "$site/sync-context.html"
  "$site/memory.html"
  "$site/iface-defer.html"
  "$site/select.html"
  "$site/string.html"
  "$site/error.html"
  "$site/generics.html"
  "$site/favicon.svg"
  "$site/assets/css/tokens.css"
  "$site/assets/css/layout.css"
  "$site/assets/css/components.css"
  "$site/assets/css/lab-motion.css"
  "$site/assets/css/guide.css"
  "$site/assets/js/site.js"
  "$site/assets/js/chapters.js"
  "$site/assets/js/motion.js"
  "$site/assets/js/guide.js"
  "$site/assets/js/gmp-lab.js"
  "$site/assets/js/channel-lab.js"
  "$site/assets/js/gc-lab.js"
  "$site/assets/js/slice-lab.js"
  "$site/assets/js/context-lab.js"
  "$site/assets/js/escape-lab.js"
  "$site/assets/js/defer-lab.js"
  "$site/assets/js/select-lab.js"
  "$site/assets/js/string-lab.js"
  "$site/assets/js/error-lab.js"
  "$site/assets/js/generics-lab.js"
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
for page in index.html gmp.html channel.html gc.html slice-map.html sync-context.html memory.html iface-defer.html select.html string.html error.html generics.html; do
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

echo "== chapter manifest =="
if [[ -f "$site/assets/js/chapters.js" ]]; then
  echo "OK  chapters.js present"
  # extract href="..." from chapters.js
  hrefs=$(grep -oE 'href:[[:space:]]*"[^"]+"' "$site/assets/js/chapters.js" | sed -E 's/.*"([^"]+)"/\1/')
  ids=$(grep -oE 'id:[[:space:]]*"[^"]+"' "$site/assets/js/chapters.js" | sed -E 's/.*"([^"]+)"/\1/')
  for h in $hrefs; do
    if [[ -f "$site/$h" ]]; then echo "OK  manifest href $h"; else echo "MISS manifest href $h"; fail=1; fi
  done
  for page in index.html gmp.html channel.html gc.html slice-map.html sync-context.html memory.html iface-defer.html select.html string.html error.html generics.html; do
    key=$(echo "$page" | sed 's/-.*//;s/\.html//')
    # map filename to id roughly via grep data-page
    dp=$(grep -oE 'data-page="[^"]+"' "$site/$page" | head -1 | sed -E 's/data-page="([^"]+)"/\1/')
    if [[ -n "$dp" ]] && echo "$ids" | grep -qx "$dp"; then
      echo "OK  $page data-page=$dp in manifest"
    else
      echo "FAIL $page data-page='$dp' not in manifest"
      fail=1
    fi
  done
else
  echo "MISS chapters.js"
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "check failed"
  exit 1
fi
echo "check passed"
