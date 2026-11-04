import { Image } from "expo-image";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IN_PROGRESS_STATUSES, type Analysis } from "@/features/analyses/analysis-schemas";
import { useModelDetails } from "@/features/analyses/analysis-queries";
import { ClaimCard } from "@/features/analyses/components/ClaimCard";
import { ProgressSteps } from "@/features/analyses/components/ProgressSteps";
import { openLink } from "@/ui/LinkedText";
import { Section } from "@/ui/Section";
import { Skeleton } from "@/ui/Skeleton";
import { FONT, RADIUS, SPACING, usePalette, type Palette } from "@/ui/theme";

const THUMBNAIL_WIDTH = 72;
const THUMBNAIL_HEIGHT = 128;

function Paragraph({ children, palette }: { children: string; palette: Palette }): ReactNode {
  return <Text style={[styles.paragraph, { color: palette.text }]}>{children}</Text>;
}

function Header({ analysis, palette }: { analysis: Analysis; palette: Palette }): ReactNode {
  const model = useModelDetails(analysis.model);
  const modelLabel = model?.label ?? analysis.model;
  return (
    <View style={styles.header}>
      {analysis.source?.thumbnailUrl ? (
        <Image source={{ uri: analysis.source.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
      ) : (
        <View style={[styles.thumbnail, { backgroundColor: palette.surfaceMuted }]} />
      )}
      <View style={styles.headerText}>
        {analysis.breakdown ? (
          <Text style={[styles.topic, { color: palette.text }]}>{analysis.breakdown.topic}</Text>
        ) : (
          <Skeleton width="80%" height={24} />
        )}
        {analysis.source?.author && (
          <Text style={[styles.author, { color: palette.textMuted }]}>by {analysis.source.author}</Text>
        )}
        {modelLabel && (
          <Text style={[styles.author, { color: palette.textMuted }]}>Researched with {modelLabel}</Text>
        )}
        <Pressable accessibilityRole="link" onPress={() => openLink(analysis.sourceUrl)} hitSlop={8}>
          <Text style={[styles.link, { color: palette.accent }]}>Open the original ↗</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Transcript({ text, palette }: { text: string; palette: Palette }): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => setIsOpen((value) => !value)} hitSlop={8}>
        <Text style={[styles.link, { color: palette.accent }]}>{isOpen ? "Hide transcript" : "Show transcript"}</Text>
      </Pressable>
      {isOpen && <Text style={[styles.transcript, { color: palette.textMuted }]}>{text}</Text>}
    </View>
  );
}

export function AnalysisReport({ analysis }: { analysis: Analysis }): ReactNode {
  const palette = usePalette();
  const breakdown = analysis.breakdown;
  const isWorking = IN_PROGRESS_STATUSES.has(analysis.status);

  return (
    <View>
      <Header analysis={analysis} palette={palette} />

      {analysis.status === "failed" && (
        <View style={[styles.errorBox, { borderColor: palette.danger }]}>
          <Text style={[styles.paragraph, { color: palette.danger }]}>
            {analysis.error?.message ?? "This analysis failed."}
          </Text>
        </View>
      )}

      {isWorking && (
        <View style={styles.progress}>
          <ProgressSteps analysis={analysis} />
        </View>
      )}

      {breakdown && (
        <>
          <Section title="What it says">
            <Paragraph palette={palette}>{breakdown.summary}</Paragraph>
            <View style={[styles.callout, { backgroundColor: palette.surfaceMuted }]}>
              <Text style={[styles.calloutLabel, { color: palette.textMuted }]}>The message it wants you to take away</Text>
              <Paragraph palette={palette}>{breakdown.coreMessage}</Paragraph>
            </View>
          </Section>

          <Section title="Claims" hint="Tap a researched claim to see the evidence and sources.">
            {breakdown.claims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                investigation={analysis.investigations.find((entry) => entry.claimId === claim.id)}
              />
            ))}
          </Section>

          {breakdown.persuasionTechniques.length > 0 && (
            <Section title="How it tries to persuade">
              {breakdown.persuasionTechniques.map((technique) => (
                <View key={technique.technique} style={styles.listItem}>
                  <Text style={[styles.itemTitle, { color: palette.text }]}>{technique.technique}</Text>
                  <Paragraph palette={palette}>{technique.howItIsUsed}</Paragraph>
                </View>
              ))}
            </Section>
          )}

          <Section title="Who is speaking">
            <Paragraph palette={palette}>{breakdown.speaker.description}</Paragraph>
            {breakdown.speaker.statedCredentials && (
              <Paragraph palette={palette}>{`Stated credentials: ${breakdown.speaker.statedCredentials}`}</Paragraph>
            )}
            {breakdown.speaker.interests.map((interest) => (
              <Paragraph key={interest} palette={palette}>{`• ${interest}`}</Paragraph>
            ))}
          </Section>

          <Section title="Questions to ask yourself">
            {breakdown.reflectionQuestions.map((question) => (
              <View key={question} style={[styles.question, { borderLeftColor: palette.accent }]}>
                <Text style={[styles.questionText, { color: palette.text }]}>{question}</Text>
              </View>
            ))}
          </Section>

          {(breakdown.limitations || analysis.transcript?.text) && (
            <Section title="About this analysis">
              {breakdown.limitations && <Paragraph palette={palette}>{breakdown.limitations}</Paragraph>}
              {analysis.transcript?.text && <Transcript text={analysis.transcript.text} palette={palette} />}
            </Section>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", gap: SPACING.lg },
  thumbnail: { width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT, borderRadius: RADIUS.md },
  headerText: { flex: 1, gap: SPACING.sm, justifyContent: "center" },
  topic: { fontFamily: "serif", fontSize: FONT.sizeXl, lineHeight: 30, fontWeight: "700" },
  author: { fontSize: FONT.sizeSm },
  link: { fontSize: FONT.sizeSm, fontWeight: "600" },
  progress: { marginTop: SPACING.xl },
  errorBox: { marginTop: SPACING.xl, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.lg },
  paragraph: { fontSize: FONT.sizeMd, lineHeight: 24 },
  callout: { borderRadius: RADIUS.md, padding: SPACING.lg, gap: SPACING.xs },
  calloutLabel: { fontSize: FONT.sizeXs, fontWeight: "700" },
  listItem: { gap: SPACING.xs },
  itemTitle: { fontSize: FONT.sizeMd, fontWeight: "700" },
  question: { borderLeftWidth: 3, paddingLeft: SPACING.md, paddingVertical: SPACING.xs },
  questionText: { fontFamily: "serif", fontSize: FONT.sizeLg, lineHeight: 27 },
  transcript: { marginTop: SPACING.sm, fontSize: FONT.sizeSm, lineHeight: 21 },
});
