import { z } from "zod";
import type { Transcript } from "@/analyses/analysis-types";
import { config } from "@/config";
import { TranscriptionError } from "@/lib/errors";
import { throwIfRetryableStatus, withRetry } from "@/lib/retry";

const GLADIA_API_BASE_URL = "https://api.gladia.io/v2";
const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_WAIT_MS = 5 * 60_000;

const UploadResponseSchema = z.object({ audio_url: z.string() });
const CreateJobResponseSchema = z.object({ id: z.string() });
const JobResponseSchema = z.looseObject({
  status: z.string(),
  error_code: z.number().nullish(),
  result: z
    .looseObject({
      transcription: z
        .looseObject({
          full_transcript: z.string().nullish(),
          languages: z.array(z.string()).nullish(),
        })
        .nullish(),
    })
    .nullish(),
});

function authHeaders(): Record<string, string> {
  return { "x-gladia-key": config.GLADIA_API_KEY };
}

async function expectOk(response: Response, step: string): Promise<unknown> {
  await throwIfRetryableStatus(response);
  if (!response.ok) {
    throw new TranscriptionError("The transcription service rejected the audio.", {
      step,
      status: response.status,
      body: (await response.text()).slice(0, 1_000),
    });
  }
  return response.json();
}

async function uploadAudio(audioPath: string): Promise<string> {
  return withRetry(
    async () => {
      const form = new FormData();
      form.append("audio", Bun.file(audioPath), "audio.mp3");
      const response = await fetch(`${GLADIA_API_BASE_URL}/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });
      return UploadResponseSchema.parse(await expectOk(response, "upload")).audio_url;
    },
    { operation: "gladia.upload" },
  );
}

async function createJob(audioUrl: string): Promise<string> {
  return withRetry(
    async () => {
      const response = await fetch(`${GLADIA_API_BASE_URL}/pre-recorded`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        // No language set: Gladia detects it, and Reels are often in French, English or mixed.
        body: JSON.stringify({ audio_url: audioUrl }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return CreateJobResponseSchema.parse(await expectOk(response, "create")).id;
    },
    { operation: "gladia.create" },
  );
}

async function waitForTranscript(jobId: string): Promise<Transcript> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const job = await withRetry(
      async () => {
        const response = await fetch(`${GLADIA_API_BASE_URL}/pre-recorded/${jobId}`, {
          headers: authHeaders(),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        return JobResponseSchema.parse(await expectOk(response, "poll"));
      },
      { operation: "gladia.poll" },
    );

    if (job.status === "done") {
      const transcription = job.result?.transcription;
      return {
        text: transcription?.full_transcript?.trim() ?? "",
        languages: transcription?.languages ?? [],
      };
    }
    if (job.status === "error") {
      throw new TranscriptionError("The transcription service could not process the audio.", {
        jobId,
        errorCode: job.error_code,
      });
    }
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  throw new TranscriptionError("Transcription took too long.", { jobId });
}

export async function transcribeAudio(audioPath: string): Promise<Transcript> {
  try {
    const audioUrl = await uploadAudio(audioPath);
    const jobId = await createJob(audioUrl);
    return await waitForTranscript(jobId);
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    throw new TranscriptionError("Could not reach the transcription service.", error);
  }
}
