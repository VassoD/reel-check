import { memo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Claim, ClaimInvestigation, Source } from "@/features/analyses/analysis-schemas";
import { EvidenceBadge } from "@/features/analyses/components/EvidenceBadge";
import { CLAIM_KIND_LABELS, SOURCE_RELATION_LABELS } from "@/features/analyses/evidence-labels";
import { LinkedText, openLink } from "@/ui/LinkedText";
import { Skeleton } from "@/ui/Skeleton";
import { FONT, RADIUS, SPACING, usePalette, type Palette } from "@/ui/theme";

interface ClaimCardProps {
  claim: Claim;
  investigation: ClaimInvestigation | undefined;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SourceRow({ source, palette }: { source: Source; palette: Palette }): ReactNode {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityHint={`Opens ${hostnameOf(source.url)}`}
      onPress={() => openLink(source.url)}
      style={({ pressed }) => [styles.source, { borderColor: palette.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.sourceMeta, { color: palette.textMuted }]}>
        {SOURCE_RELATION_LABELS[source.relation]} · {source.publisher}
      </Text>
      <Text style={[styles.sourceTitle, { color: palette.text }]} numberOfLines={2}>
        {source.title}
      </Text>
      <Text style={[styles.body, { color: palette.textMuted }]}>{source.keyFinding}</Text>
    </Pressable>
  );
}

function Detail({ label, text, palette }: { label: string; text: string; palette: Palette }): ReactNode {
  return (
    <View style={styles.detail}>
      <Text style={[styles.detailLabel, { color: palette.text }]}>{label}</Text>
      <LinkedText style={[styles.body, { color: palette.text }]}>{text}</LinkedText>
    </View>
  );
}

function InvestigationBody({ investigation, palette }: { investigation: ClaimInvestigation; palette: Palette }): ReactNode {
  const result = investigation.result;
  if (!result) return null;
  return (
    <View style={styles.expanded}>
      <Detail label="What the evidence shows" text={result.whatTheEvidenceShows} palette={palette} />
      {result.missingContext && <Detail label="Missing context" text={result.missingContext} palette={palette} />}
      {result.strongestCounterpoint && (
        <Detail label="The strongest other side" text={result.strongestCounterpoint} palette={palette} />
      )}
      <Text style={[styles.detailLabel, { color: palette.text }]}>Sources</Text>
      {result.sources.map((source) => (
        <SourceRow key={source.url} source={source} palette={palette} />
      ))}
      {result.sources.length === 0 && (
        <Text style={[styles.body, { color: palette.textMuted }]}>No sources could be confirmed for this claim.</Text>
      )}
      {result.unverifiedSourceCount > 0 && (
        <Text style={[styles.footnote, { color: palette.textMuted }]}>
          {result.unverifiedSourceCount} source(s) were left out because the research never actually opened them.
        </Text>
      )}
    </View>
  );
}

export const ClaimCard = memo(function ClaimCard({ claim, investigation }: ClaimCardProps): ReactNode {
  const palette = usePalette();
  const [isExpanded, setIsExpanded] = useState(false);
  const result = investigation?.result ?? null;
  const isResearching = investigation?.status === "pending" || investigation?.status === "running";

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        disabled={!result}
        onPress={() => setIsExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded, disabled: !result }}
        style={styles.header}
      >
        <Text style={[styles.kind, { color: palette.textMuted }]}>
          {CLAIM_KIND_LABELS[claim.kind] ?? claim.kind}
          {claim.centrality === "core" ? " · Core claim" : ""}
        </Text>
        <Text style={[styles.statement, { color: palette.text }]}>{claim.statement}</Text>
        {claim.quote && (
          <Text style={[styles.quote, { color: palette.textMuted, borderLeftColor: palette.border }]}>
            “{claim.quote}”
          </Text>
        )}

        {isResearching && (
          <View style={styles.pending}>
            <Skeleton width={110} height={18} />
            <Skeleton width="85%" />
          </View>
        )}
        {investigation?.status === "failed" && (
          <Text style={[styles.body, { color: palette.danger }]}>
            {investigation.errorMessage ?? "Research failed for this claim."}
          </Text>
        )}
        {!investigation && (
          <Text style={[styles.footnote, { color: palette.textMuted }]}>
            {claim.kind === "opinion" ? "An opinion, so there is nothing to fact-check." : "Not researched."}
          </Text>
        )}
        {result && (
          <View style={styles.verdict}>
            <EvidenceBadge status={result.evidenceStatus} />
            <Text style={[styles.headline, { color: palette.text }]}>{result.headline}</Text>
            <Text style={[styles.toggle, { color: palette.accent }]}>
              {isExpanded ? "Hide the research" : `See the research · ${result.sources.length} sources`}
            </Text>
          </View>
        )}
      </Pressable>
      {isExpanded && investigation && <InvestigationBody investigation={investigation} palette={palette} />}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADIUS.lg, overflow: "hidden" },
  header: { padding: SPACING.lg, gap: SPACING.sm },
  kind: { fontSize: FONT.sizeXs, fontWeight: "600", letterSpacing: 0.3 },
  statement: { fontSize: FONT.sizeMd, lineHeight: 23, fontWeight: "600" },
  quote: { fontSize: FONT.sizeSm, lineHeight: 20, fontStyle: "italic", borderLeftWidth: 2, paddingLeft: SPACING.sm },
  pending: { gap: SPACING.sm, marginTop: SPACING.xs },
  verdict: { gap: SPACING.sm, marginTop: SPACING.xs },
  headline: { fontSize: FONT.sizeSm, lineHeight: 21 },
  toggle: { fontSize: FONT.sizeSm, fontWeight: "600" },
  expanded: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.md },
  detail: { gap: SPACING.xs },
  detailLabel: { fontSize: FONT.sizeSm, fontWeight: "700" },
  body: { fontSize: FONT.sizeSm, lineHeight: 21 },
  footnote: { fontSize: FONT.sizeXs, lineHeight: 17 },
  source: { borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.xs },
  sourceMeta: { fontSize: FONT.sizeXs, fontWeight: "600" },
  sourceTitle: { fontSize: FONT.sizeSm, fontWeight: "600", lineHeight: 20 },
});
