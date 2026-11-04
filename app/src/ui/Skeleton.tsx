import { useEffect, useState, type ReactNode } from "react";
import { Animated, type DimensionValue } from "react-native";
import { RADIUS, usePalette } from "@/ui/theme";

const PULSE_DURATION_MS = 800;

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
}

export function Skeleton({ width = "100%", height = 14 }: SkeletonProps): ReactNode {
  const palette = usePalette();
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: PULSE_DURATION_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: PULSE_DURATION_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ width, height, borderRadius: RADIUS.sm, backgroundColor: palette.surfaceMuted, opacity }}
    />
  );
}
