#!/bin/sh
# Magaza icin zip paketi uretir: yalnizca eklentinin calismasi icin gereken dosyalar.
set -e
cd "$(dirname "$0")/.."
version=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
out="store/tetik-$version.zip"
rm -f "$out"
zip -q -r -X "$out" manifest.json LICENSE src icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png
echo "$out"
unzip -l "$out"
