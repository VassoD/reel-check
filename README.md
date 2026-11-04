# Reel Check

A personal project for cross-checking misleading Reels that show up in my Instagram feed.

Reel Check is a research companion for short social videos. Share an Instagram Reel (or a TikTok or YouTube Short) to the Android app. The server downloads it, transcribes it, breaks it into claims, researches each claim on the web, and sends back a report: what the video says, what the evidence shows (with sources), what's missing, how it tries to persuade you, and questions worth asking yourself.

It gives you evidence and context. It doesn't give the video an overall verdict.

```
Android app ──share/paste URL──▶ server (your Mac)
                                   ├─ yt-dlp       download video + caption
                                   ├─ ffmpeg       audio track + still frames
                                   ├─ Gladia       speech to text
                                   ├─ OpenAI       claims, framing, questions (vision)
                                   └─ OpenAI       one web-search investigation per claim
◀──────────── polls every 2.5s, claims fill in as they finish
```

## Prerequisites

- [Bun](https://bun.sh) 1.3+, `yt-dlp` and `ffmpeg` (`brew install yt-dlp ffmpeg`)
- An OpenAI API key and a [Gladia](https://app.gladia.io) API key
- For the app: Node 22, JDK 17 (`brew install openjdk@17`), the Android SDK, and an Android phone with USB debugging (or `adb` over Wi-Fi)

## Server

```bash
cd server
bun install
cp .env.example .env    # fill in the keys; generate APP_TOKEN with: openssl rand -hex 24
bun run dev             # http://0.0.0.0:8787
```

Try a video without the app:

```bash
bun run analyze "https://www.instagram.com/reel/XXXXXXXX/"
```

Environment variables are documented in [`server/.env.example`](server/.env.example).

### Hosting on Fly.io

The server runs on Fly.io (`server/fly.toml`, app `reel-check-vd` in Paris), so the phone doesn't depend on the Mac. It uses one always-on `shared-cpu-1x` machine with 512 MB, plus a 1 GB volume at `/data` for the SQLite history and the published APK.

```bash
cd server
fly deploy                                        # build on Fly's servers and roll out
grep -E '^(OPENAI_API_KEY|GLADIA_API_KEY|APP_TOKEN)=' .env | fly secrets import   # after changing a key
fly logs                                          # live logs
```

The machine stays on (`auto_stop_machines = "off"`) because analyses keep running after the request that started them. To update yt-dlp when Instagram downloads break, bump `YTDLP_VERSION` in the `Dockerfile` and redeploy.

### API

All routes under `/api/v1` need `Authorization: Bearer <APP_TOKEN>`. Responses use `{ data }` or `{ error: { code, message, requestId } }`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/analyses` | `{ "url": "<link or shared text>", "model"?: "gpt-6-luna", "refresh"?: true }`. Returns `202` with a new analysis, or `200` with an existing one for the same video and model |
| `GET` | `/api/v1/app/latest`, `/api/v1/app/apk` | Latest published app build, and its APK for in-app updates |
| `GET` | `/api/v1/models` | Models the app can choose from, with rough cost per video, and the default |
| `GET` | `/api/v1/analyses?limit=20&offset=0` | History, newest first |
| `GET` | `/api/v1/analyses/:id` | Full analysis; poll it until `status` is `done` or `failed` |
| `DELETE` | `/api/v1/analyses/:id` | Soft delete |
| `GET` | `/health` | Liveness check, no auth |

## Android app

```bash
cd app
npm install
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

Open **Reel Check**, go to *Server settings*, and enter your Mac's Wi-Fi address (for example `192.168.1.90:8787`) and the `APP_TOKEN`. Then in Instagram, tap **Share** on a Reel and choose **Reel Check**.

For development, use `npm run android` (dev client with fast refresh) instead of the release build.

### Updating the app

```bash
cd app && npm run release:android
```

This bumps the version, builds the APK and publishes it to `server/data/app/`. On the phone, open **Settings → Check for updates → Download and install**. The first time, Android asks you to allow Reel Check to install apps. Updates keep your settings and history, because every build is signed with the same key (`android/app/debug.keystore`). Don't delete that file.

## Costs

One video uses roughly 200k input tokens, about 12 web searches, and a few cents of Gladia. Pick the model in the app's Settings, or per video with **Re-analyze**:

| Model | Rough cost per video |
|---|---|
| Astra (`gpt-6-astra`) | $2.60 |
| Sol (`gpt-6.1-sol`, default) | $0.60 |
| Terra (`gpt-6.1-terra`) | $0.35 |
| Luna (`gpt-6-luna`) | $0.15 |

Results are cached per video and model, so sharing the same Reel again is free. `MAX_ANALYSES_PER_HOUR` caps spending.

## Known limits

- **Instagram may block downloads.** It throttles anonymous scraping, and running from a home IP helps. If downloads start failing with `DOWNLOAD_BLOCKED`, log in to Instagram in Chrome on the Mac and set `YTDLP_COOKIES_FROM_BROWSER=chrome`. Keep yt-dlp current (`brew upgrade yt-dlp`), since Instagram changes often.
- **The phone must reach the Mac.** It works on the same Wi-Fi. For use away from home, put both devices on [Tailscale](https://tailscale.com) and use the Mac's Tailscale address.
- **The research is only as good as what's findable.** Very recent, local or niche claims often come back as "Can't be verified". Sources the model cites but never actually opened are dropped automatically.
