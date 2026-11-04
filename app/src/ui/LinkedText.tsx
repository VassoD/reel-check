import * as WebBrowser from "expo-web-browser";
import { Fragment, type ReactNode } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { usePalette } from "@/ui/theme";

const MARKDOWN_LINK_PATTERN = /\(?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\)?/g;

interface LinkedTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

export function openLink(url: string): void {
  void WebBrowser.openBrowserAsync(url).catch(() => undefined);
}

/** Renders `[label](url)` citations from the research output as tappable inline links. */
export function LinkedText({ children, style }: LinkedTextProps): ReactNode {
  const palette = usePalette();
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of children.matchAll(MARKDOWN_LINK_PATTERN)) {
    const [whole, label, url] = match;
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push(children.slice(lastIndex, index));
    parts.push(
      <Text
        key={`${index}-${url}`}
        accessibilityRole="link"
        onPress={() => url && openLink(url)}
        style={{ color: palette.accent, textDecorationLine: "underline" }}
      >
        {label}
      </Text>,
    );
    lastIndex = index + whole.length;
  }
  if (lastIndex < children.length) parts.push(children.slice(lastIndex));

  return (
    <Text style={style}>
      {parts.map((part, index) => (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </Text>
  );
}
