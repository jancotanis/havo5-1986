#!/bin/sh
# Maakt slideshow/<jaar>.json met alle foto's (jpg/png/webp) en video's (mov/mp4/m4v) per map.
# Gebruik: sh tools/maak-lijsten.sh   (vanuit de hoofdmap)
set -e
for dir in slideshow/*/; do
  jaar=$(basename "$dir")
  ls "$dir" | grep -iE '\.(jpe?g|png|webp|mov|mp4|m4v)$' | sort | python3 -c '
import sys, json
print(json.dumps([l.strip() for l in sys.stdin if l.strip()], indent=1))
' > "slideshow/$jaar.json"
  echo "slideshow/$jaar.json: $(grep -c '"' "slideshow/$jaar.json" || true) foto's"
done
