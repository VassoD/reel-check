#!/usr/bin/env bash
# Builds a release APK with the next version code and publishes it to the local server,
# where the app's "Check for updates" button picks it up.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$APP_DIR/../server/data/app"
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

mkdir -p "$RELEASE_DIR"
# APK first, manifest last, so the server never advertises a build it can't serve yet.
cp "$APK_OUTPUT" "$RELEASE_DIR/reel-check.apk.partial"
mv "$RELEASE_DIR/reel-check.apk.partial" "$RELEASE_DIR/reel-check.apk"
printf '{"versionCode":%s,"versionName":"%s","publishedAt":"%s"}\n' \
  "$VERSION_CODE" "$VERSION_NAME" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$RELEASE_DIR/latest.json"

echo "Published ${VERSION_NAME}. Open Settings > Check for updates on the phone."
