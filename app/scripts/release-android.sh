#!/usr/bin/env bash
# Builds a release APK with the next version code and publishes it where the app's
# "Check for updates" button looks: the Fly.io server by default, or the local server
# with PUBLISH_TO=local.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$APP_DIR/../server"
RELEASE_DIR="$SERVER_DIR/data/app"
PUBLISH_TO="${PUBLISH_TO:-fly}"
REMOTE_RELEASE_DIR="/data/app"
APK_OUTPUT="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"

cd "$APP_DIR"

VERSION_CODE=$(node -e '
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("app.json", "utf8"));
const next = (config.expo.android.versionCode ?? 1) + 1;
config.expo.android.versionCode = next;
config.expo.version = `1.0.${next}`;
fs.writeFileSync("app.json", JSON.stringify(config, null, 2) + "\n");
process.stdout.write(String(next));
')
VERSION_NAME="1.0.${VERSION_CODE}"
echo "Building ${VERSION_NAME} (${VERSION_CODE})"

# Syncs the new version and any app.json changes into the native project.
CI=1 npx expo prebuild --platform android --no-install
(cd android && ./gradlew assembleRelease -q)

MANIFEST="{\"versionCode\":${VERSION_CODE},\"versionName\":\"${VERSION_NAME}\",\"publishedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

# APK first, manifest last, so the server never advertises a build it can't serve yet.
if [ "$PUBLISH_TO" = "fly" ]; then
  FLY_CONFIG="$SERVER_DIR/fly.toml"
  MANIFEST_FILE="$(mktemp)"
  echo "$MANIFEST" > "$MANIFEST_FILE"
  fly ssh console -c "$FLY_CONFIG" -C "sh -c 'mkdir -p $REMOTE_RELEASE_DIR && rm -f $REMOTE_RELEASE_DIR/*.partial'"
  fly ssh sftp put -c "$FLY_CONFIG" "$APK_OUTPUT" "$REMOTE_RELEASE_DIR/reel-check.apk.partial"
  fly ssh sftp put -c "$FLY_CONFIG" "$MANIFEST_FILE" "$REMOTE_RELEASE_DIR/latest.json.partial"
  fly ssh console -c "$FLY_CONFIG" -C "sh -c 'mv $REMOTE_RELEASE_DIR/reel-check.apk.partial $REMOTE_RELEASE_DIR/reel-check.apk && mv $REMOTE_RELEASE_DIR/latest.json.partial $REMOTE_RELEASE_DIR/latest.json'"
  rm -f "$MANIFEST_FILE"
else
  mkdir -p "$RELEASE_DIR"
  cp "$APK_OUTPUT" "$RELEASE_DIR/reel-check.apk.partial"
  mv "$RELEASE_DIR/reel-check.apk.partial" "$RELEASE_DIR/reel-check.apk"
  echo "$MANIFEST" > "$RELEASE_DIR/latest.json"
fi

echo "Published ${VERSION_NAME} to ${PUBLISH_TO}. Open Settings > Check for updates on the phone."
