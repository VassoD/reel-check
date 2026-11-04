import path from "node:path";
import { Hono } from "hono";
import type { RequestIdVariables } from "hono/request-id";
import { z } from "zod";
import { config } from "@/config";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** Written by app/scripts/release-android.sh next to the APK it builds. */
export const APP_RELEASE_DIR = path.join(config.DATA_DIR, "app");
const MANIFEST_PATH = path.join(APP_RELEASE_DIR, "latest.json");
const APK_PATH = path.join(APP_RELEASE_DIR, "reel-check.apk");
const APK_CONTENT_TYPE = "application/vnd.android.package-archive";

const ReleaseManifestSchema = z.object({
  versionCode: z.number().int().positive(),
  versionName: z.string(),
  publishedAt: z.string(),
});

type ReleaseManifest = z.infer<typeof ReleaseManifestSchema>;

async function readLatestRelease(): Promise<(ReleaseManifest & { sizeBytes: number }) | null> {
  const manifestFile = Bun.file(MANIFEST_PATH);
  const apkFile = Bun.file(APK_PATH);
  if (!(await manifestFile.exists()) || !(await apkFile.exists())) return null;
  try {
    const manifest = ReleaseManifestSchema.parse(await manifestFile.json());
    return { ...manifest, sizeBytes: apkFile.size };
  } catch (error) {
    logger.error("App release manifest is unreadable", { path: MANIFEST_PATH, error });
    return null;
  }
}

export const appUpdateRoutes = new Hono<{ Variables: RequestIdVariables }>()
  .get("/latest", async (c) => {
    const release = await readLatestRelease();
    if (!release) throw new NotFoundError("No app build has been published on this server yet.");
    return c.json({ data: release });
  })
  .get("/apk", async () => {
    const apkFile = Bun.file(APK_PATH);
    if (!(await apkFile.exists())) throw new NotFoundError("No app build has been published on this server yet.");
    return new Response(apkFile, {
      headers: {
        "Content-Type": APK_CONTENT_TYPE,
        "Content-Disposition": 'attachment; filename="reel-check.apk"',
        "Cache-Control": "no-store",
      },
    });
  });
