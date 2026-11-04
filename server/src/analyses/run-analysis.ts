import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Analysis, Claim, ClaimInvestigation } from "@/analyses/analysis-types";
import { analysisStore } from "@/analyses/analysis-store";
import { config } from "@/config";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { Semaphore } from "@/lib/semaphore";
import { downloadReel } from "@/media/download-reel";
import { extractMedia } from "@/media/extract-media";
import { breakDownContent } from "@/research/break-down-content";
import { investigateClaim } from "@/research/investigate-claim";
import { defaultResearchModel } from "@/research/research-models";
import { CLAIM_CENTRALITY } from "@/research/research-schemas";
import { transcribeAudio } from "@/transcription/gladia";

const analysisSlots = new Semaphore(config.MAX_CONCURRENT_ANALYSES);

export function createAnalysis(sourceUrl: string, model: string = defaultResearchModel()): Analysis {
  const now = new Date().toISOString();
  const analysis: Analysis = {
    id: crypto.randomUUID(),
    sourceUrl,
    model,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    source: null,
    transcript: null,
    breakdown: null,
    investigations: [],
    usage: { inputTokens: 0, outputTokens: 0, webSearches: 0 },
    error: null,
  };
  analysisStore.save(analysis);
  return analysis;
}

function pickClaimsToInvestigate(claims: Claim[]): Claim[] {
  return claims
    .filter((claim) => claim.checkable && claim.kind !== "opinion")
    .sort((a, b) => CLAIM_CENTRALITY.indexOf(a.centrality) - CLAIM_CENTRALITY.indexOf(b.centrality))
    .slice(0, config.MAX_CLAIMS_TO_INVESTIGATE);
}

async function investigateAll(
  analysis: Analysis,
  claims: Claim[],
  videoTopic: string,
  videoSummary: string,
  model: string,
): Promise<void> {
  analysis.investigations = claims.map(
    (claim): ClaimInvestigation => ({ claimId: claim.id, status: "pending", result: null, errorMessage: null }),
  );
  analysisStore.save(analysis);

  // Claims are researched in parallel and saved one by one, so the app can show each as it lands.
  await Promise.all(
    claims.map(async (claim, index) => {
      const entry = analysis.investigations[index];
      if (!entry) return;
      entry.status = "running";
      analysisStore.save(analysis);
      try {
        const { investigation, usage } = await investigateClaim({ claim, videoTopic, videoSummary, model });
        entry.status = "done";
        entry.result = investigation;
        analysis.usage.inputTokens += usage.inputTokens;
        analysis.usage.outputTokens += usage.outputTokens;
        analysis.usage.webSearches += usage.webSearches;
      } catch (error) {
        logger.error("Claim investigation failed", { analysisId: analysis.id, claimId: claim.id, error });
        entry.status = "failed";
        entry.errorMessage = error instanceof AppError ? error.message : "Research failed for this claim.";
      }
      analysisStore.save(analysis);
    }),
  );
}

async function runSteps(analysis: Analysis, workDir: string): Promise<void> {
  const { model } = analysis;
  analysis.status = "downloading";
  analysisStore.save(analysis);
  const { videoPath, source } = await downloadReel(analysis.sourceUrl, workDir);
  analysis.source = source;

  analysis.status = "transcribing";
  analysisStore.save(analysis);
  const media = await extractMedia(videoPath, workDir, source.durationSeconds);
  analysis.transcript = media.audioPath ? await transcribeAudio(media.audioPath) : null;

  analysis.status = "breaking_down";
  analysisStore.save(analysis);
  const { breakdown, usage } = await breakDownContent({
    source,
    transcript: analysis.transcript,
    framePaths: media.framePaths,
    model,
  });
  const claims: Claim[] = breakdown.claims.map((claim, index) => ({ ...claim, id: `c${index + 1}` }));
  analysis.breakdown = { ...breakdown, claims };
  analysis.usage.inputTokens += usage.inputTokens;
  analysis.usage.outputTokens += usage.outputTokens;

  analysis.status = "investigating";
  analysisStore.save(analysis);
  await investigateAll(analysis, pickClaimsToInvestigate(claims), breakdown.topic, breakdown.summary, model);

  analysis.status = "done";
  analysisStore.save(analysis);
}

/** Runs the whole pipeline, persisting progress after each step. Never throws: failures are recorded on the analysis. */
export async function runAnalysis(analysis: Analysis): Promise<void> {
  const release = await analysisSlots.acquire();
  const startedAt = Date.now();
  const workDir = await mkdtemp(path.join(tmpdir(), "reel-check-"));
  try {
    logger.info("Analysis started", { analysisId: analysis.id, sourceUrl: analysis.sourceUrl, model: analysis.model });
    await runSteps(analysis, workDir);
    logger.info("Analysis finished", {
      analysisId: analysis.id,
      durationMs: Date.now() - startedAt,
      usage: analysis.usage,
    });
  } catch (error) {
    logger.error("Analysis failed", { analysisId: analysis.id, status: analysis.status, error });
    analysis.status = "failed";
    analysis.error =
      error instanceof AppError
        ? { code: error.code, message: error.message }
        : { code: "INTERNAL_ERROR", message: "Something went wrong while analyzing this video." };
    analysisStore.save(analysis);
  } finally {
    release();
    await rm(workDir, { recursive: true, force: true });
  }
}
