import * as Application from "expo-application";
import { File, Paths } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { z } from "zod";
import { API_PREFIX, ApiError, request } from "@/features/analyses/api-client";
import type { ServerSettings } from "@/features/settings/settings-storage";

const APK_MIME_TYPE = "application/vnd.android.package-archive";
const APK_FILE_NAME = "reel-check-update.apk";
const HTTP_NOT_FOUND = 404;
// Intent.FLAG_GRANT_READ_URI_PERMISSION, so the system installer may read the downloaded file.
const FLAG_GRANT_READ_URI_PERMISSION = 1;

const LatestReleaseResponseSchema = z.object({
  data: z.looseObject({
    versionCode: z.number(),
    versionName: z.string(),
    publishedAt: z.string(),
    sizeBytes: z.number(),
  }),
});

export type LatestRelease = z.infer<typeof LatestReleaseResponseSchema>["data"];

export class InstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstallError";
  }
}

export function installedVersionCode(): number {
  return Number(Application.nativeBuildVersion ?? 0);
}

export function installedVersionName(): string {
  return Application.nativeApplicationVersion ?? "unknown";
}

/** Returns null when the server has no build published yet. */
export async function fetchLatestRelease(settings: ServerSettings, signal?: AbortSignal): Promise<LatestRelease | null> {
  try {
    const { data } = await request(settings, `${API_PREFIX}/app/latest`, LatestReleaseResponseSchema, { signal });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === HTTP_NOT_FOUND) return null;
    throw error;
  }
}

/** Downloads the published APK, then hands it to Android's installer, which asks the user to confirm. */
export async function downloadAndInstallUpdate(
  settings: ServerSettings,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const destination = new File(Paths.cache, APK_FILE_NAME);
  let downloaded: File;
  try {
    downloaded = await File.downloadFileAsync(`${settings.baseUrl}${API_PREFIX}/app/apk`, destination, {
      headers: { Authorization: `Bearer ${settings.token}` },
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => {
        if (totalBytes > 0) onProgress(bytesWritten / totalBytes);
      },
    });
  } catch {
    throw new InstallError("The download failed. Check that you're on the same Wi-Fi as the server and try again.");
  }

  try {
    const contentUri = await getContentUriAsync(downloaded.uri);
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      type: APK_MIME_TYPE,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  } catch {
    throw new InstallError("Android couldn't open the installer. Allow Reel Check to install apps, then try again.");
  }
}
