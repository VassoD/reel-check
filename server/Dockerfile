# Bun server plus the media tools the pipeline shells out to (yt-dlp, ffmpeg, ffprobe).
FROM oven/bun:1.3.0-slim

# Instagram changes often, so bump this to the latest yt-dlp release when downloads start failing.
ARG YTDLP_VERSION=2026.10.26
# Set by BuildKit: amd64 on Fly, arm64 when building locally on Apple silicon.
ARG TARGETARCH

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
  && YTDLP_ASSET=$([ "$TARGETARCH" = "arm64" ] && echo yt-dlp_linux_aarch64 || echo yt-dlp_linux) \
  && curl -fsSL -o /usr/local/bin/yt-dlp \
    "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/${YTDLP_ASSET}" \
  && chmod +x /usr/local/bin/yt-dlp \
  && apt-get purge -y curl \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DATA_DIR=/data

EXPOSE 8787
CMD ["bun", "src/index.ts"]
