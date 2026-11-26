#!/usr/bin/env bash
# Sign the sideload release APK in CI. The keystore is never on disk in the repository: it
# arrives base64 in ANDROID_KEYSTORE_B64, is written to $RUNNER_TEMP with 0600, and removed on
# every exit path. Passwords go to the tools through the environment, not through files.
set -euo pipefail

VERSION="${1:?usage: sign-apk-ci.sh <version>}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APK_DIR="$ROOT/frontend/android/app/build/outputs/apk/sideload/release"
UNSIGNED="$APK_DIR/app-sideload-release-unsigned.apk"
[ -f "$UNSIGNED" ] || { echo "unsigned APK not found in $APK_DIR" >&2; ls -l "$APK_DIR" >&2 || true; exit 1; }

: "${ANDROID_KEYSTORE_B64:?ANDROID_KEYSTORE_B64 is not set}"
: "${ANDROID_STORE_PASSWORD:?ANDROID_STORE_PASSWORD is not set}"
: "${ANDROID_KEY_PASSWORD:?ANDROID_KEY_PASSWORD is not set}"
: "${ANDROID_KEY_ALIAS:?ANDROID_KEY_ALIAS is not set}"

OUT="$ROOT/release"
mkdir -p "$OUT"
APK="$OUT/openGym-$VERSION.apk"
KS="$RUNNER_TEMP/opengym-release.jks"

umask 077
printf '%s' "$ANDROID_KEYSTORE_B64" | base64 -d > "$KS"
cleanup() { rm -f "$KS"; }
trap cleanup EXIT

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[ -n "$SDK" ] || { echo "ANDROID_HOME/ANDROID_SDK_ROOT is not set" >&2; exit 1; }
BT="$SDK/build-tools/36.0.0"
[ -x "$BT/apksigner" ] || BT="$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)"

"$BT/zipalign" -f -p 4 "$UNSIGNED" "$APK"
"$BT/apksigner" sign \
  --ks "$KS" \
  --ks-key-alias "$ANDROID_KEY_ALIAS" \
  --ks-pass env:ANDROID_STORE_PASSWORD \
  --key-pass env:ANDROID_KEY_PASSWORD \
  "$APK"
"$BT/apksigner" verify --print-certs "$APK"

( cd "$OUT" && sha256sum "openGym-$VERSION.apk" > "openGym-$VERSION.apk.sha256" )

awk -v v="$VERSION" 'BEGIN{p=0} $0 ~ "^## v"v"([^0-9.]|$)"{p=1; print; next} p && /^## v/{exit} p{print}' "$ROOT/CHANGELOG.md" > "$OUT/notes.md"
[ -s "$OUT/notes.md" ] || printf 'openGym %s\n' "$VERSION" > "$OUT/notes.md"

ls -lh "$OUT"
