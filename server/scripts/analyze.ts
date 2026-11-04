/**
 * Runs one analysis end to end without the HTTP server, then prints a readable report.
 * Usage: bun run analyze <reel-url>
 */
import { analysisStore } from "@/analyses/analysis-store";
import type { Analysis } from "@/analyses/analysis-types";
import { createAnalysis, runAnalysis } from "@/analyses/run-analysis";
import { normalizeSourceUrl } from "@/media/source-url";

function render(analysis: Analysis): string {
  if (analysis.status === "failed") return `FAILED [${analysis.error?.code}] ${analysis.error?.message}`;
  const breakdown = analysis.breakdown;
  if (!breakdown) return "No breakdown produced.";

  const lines = [
    `# ${breakdown.topic}`,
    `By ${analysis.source?.author ?? "unknown"} · ${analysis.sourceUrl}`,
    "",
    breakdown.summary,
    "",
    `Core message: ${breakdown.coreMessage}`,
    `Speaker: ${breakdown.speaker.description}${breakdown.speaker.interests.length ? ` (interests: ${breakdown.speaker.interests.join("; ")})` : ""}`,
    "",
    "## Claims",
  ];
  for (const claim of breakdown.claims) {
    lines.push(`- [${claim.id}] (${claim.kind}, ${claim.centrality}) ${claim.statement}`);
    const investigation = analysis.investigations.find((entry) => entry.claimId === claim.id);
    if (investigation?.result) {
      const result = investigation.result;
      lines.push(`    → ${result.evidenceStatus.toUpperCase()} (${result.confidence} confidence): ${result.headline}`);
      if (result.missingContext) lines.push(`    Missing context: ${result.missingContext}`);
      for (const source of result.sources.slice(0, 3)) {
        lines.push(`    · [${source.relation}] ${source.publisher}: ${source.url}`);
      }
      if (result.unverifiedSourceCount > 0) lines.push(`    (${result.unverifiedSourceCount} unverified source(s) dropped)`);
    } else if (investigation?.status === "failed") {
      lines.push(`    → research failed: ${investigation.errorMessage}`);
    }
  }
  lines.push("", "## How it persuades");
  for (const technique of breakdown.persuasionTechniques) lines.push(`- ${technique.technique}: ${technique.howItIsUsed}`);
  lines.push("", "## Questions to ask yourself");
  for (const question of breakdown.reflectionQuestions) lines.push(`- ${question}`);
  if (breakdown.limitations) lines.push("", `Limitations: ${breakdown.limitations}`);
  lines.push(
    "",
    `Usage: ${analysis.usage.inputTokens} input / ${analysis.usage.outputTokens} output tokens, ${analysis.usage.webSearches} web searches`,
  );
  return lines.join("\n");
}

const input = process.argv[2];
if (!input) {
  process.stderr.write("Usage: bun run analyze <reel-url>\n");
  process.exit(1);
}

const analysis = createAnalysis(normalizeSourceUrl(input));
await runAnalysis(analysis);
process.stdout.write(`${render(analysisStore.findById(analysis.id) ?? analysis)}\n`);
