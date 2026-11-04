import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInputContent } from "openai/resources/responses/responses";
import type { ReelSource, Transcript } from "@/analyses/analysis-types";
import { config } from "@/config";
import { openai, requireParsedOutput, toResearchError, usageOf, type CallUsage } from "@/research/openai-client";
import { breakdownInstructions } from "@/research/prompts";
import { BreakdownSchema, type Breakdown } from "@/research/research-schemas";

const MAX_OUTPUT_TOKENS = 16_000;
const REASONING_EFFORT = "medium";

interface BreakdownInput {
  source: ReelSource;
  transcript: Transcript | null;
  framePaths: string[];
  model: string;
}

function describeContent({ source, transcript }: BreakdownInput): string {
  const metadata = {
    author: source.author,
    postedAt: source.postedAt,
    durationSeconds: source.durationSeconds,
    views: source.viewCount,
    likes: source.likeCount,
  };
  const transcriptText = transcript?.text
    ? `Detected language(s): ${transcript.languages.join(", ") || "unknown"}\n${transcript.text}`
    : "(no speech detected)";

  return [
    `<metadata>\n${JSON.stringify(metadata, null, 2)}\n</metadata>`,
    `<caption>\n${source.caption ?? "(no caption)"}\n</caption>`,
    `<transcript>\n${transcriptText}\n</transcript>`,
    "The still frames below are in chronological order.",
  ].join("\n\n");
}

async function frameToImageInput(framePath: string): Promise<ResponseInputContent> {
  const base64 = Buffer.from(await Bun.file(framePath).arrayBuffer()).toString("base64");
  return { type: "input_image", image_url: `data:image/jpeg;base64,${base64}`, detail: "auto" };
}

export async function breakDownContent(input: BreakdownInput): Promise<{ breakdown: Breakdown; usage: CallUsage }> {
  try {
    const images = await Promise.all(input.framePaths.map(frameToImageInput));
    const response = await openai.responses.parse({
      model: input.model,
      instructions: breakdownInstructions(config.REPORT_LANGUAGE),
      input: [{ role: "user", content: [{ type: "input_text", text: describeContent(input) }, ...images] }],
      reasoning: { effort: REASONING_EFFORT },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      text: { format: zodTextFormat(BreakdownSchema, "content_breakdown") },
    });
    return { breakdown: requireParsedOutput(response, "breakdown"), usage: usageOf(response) };
  } catch (error) {
    throw toResearchError(error, "breakdown");
  }
}
