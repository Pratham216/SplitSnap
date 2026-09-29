import { Platform, StyleSheet, Text, View, type TextStyle } from "react-native";
import Svg, {
  Defs,
  G,
  LinearGradient,
  Mask,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

type WordmarkSize = "sm" | "md" | "lg" | "xl";

const fontSizes: Record<WordmarkSize, number> = {
  sm: 18,
  md: 20,
  lg: 24,
  xl: 30,
};

const ZAP_STOPS = [
  { offset: "0%", color: "#ffffff" },
  { offset: "10%", color: "#f4f4f5" },
  { offset: "24%", color: "#d4d4d8" },
  { offset: "40%", color: "#a1a1aa" },
  { offset: "54%", color: "#e4e4e7" },
  { offset: "68%", color: "#9ca3af" },
  { offset: "84%", color: "#d1d5db" },
  { offset: "100%", color: "#fafafa" },
] as const;

const TAB_STOPS = [
  { offset: "0%", color: "#fffef5" },
  { offset: "9%", color: "#ffe566" },
  { offset: "22%", color: "#ffd000" },
  { offset: "38%", color: "#c9a000" },
  { offset: "52%", color: "#ffe44d" },
  { offset: "66%", color: "#a67c00" },
  { offset: "82%", color: "#ffd633" },
  { offset: "100%", color: "#fff5b8" },
] as const;

const ZAP_GRADIENT_WEB = {
  backgroundImage:
    "linear-gradient(168deg, #ffffff 0%, #f4f4f5 10%, #d4d4d8 24%, #a1a1aa 40%, #e4e4e7 54%, #9ca3af 68%, #d1d5db 84%, #fafafa 100%)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  filter:
    "drop-shadow(0 1px 0 rgba(255, 255, 255, 0.45)) drop-shadow(0 2px 1px rgba(0, 0, 0, 0.85)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45))",
} as TextStyle;

const TAB_GRADIENT_WEB = {
  backgroundImage:
    "linear-gradient(168deg, #fffef5 0%, #ffe566 9%, #ffd000 22%, #c9a000 38%, #ffe44d 52%, #a67c00 66%, #ffd633 82%, #fff5b8 100%)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  filter:
    "drop-shadow(0 1px 0 rgba(255, 230, 120, 0.55)) drop-shadow(0 2px 1px rgba(0, 0, 0, 0.9)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))",
} as TextStyle;

interface ZapTabWordmarkProps {
  size?: WordmarkSize;
  style?: TextStyle;
}

export default function ZapTabWordmark({
  size = "lg",
  style,
}: ZapTabWordmarkProps) {
  const fontSize = fontSizes[size];

  if (Platform.OS === "web") {
    return (
      <Text
        accessibilityLabel="ZapTab"
        style={[styles.base, { fontSize }, style]}
      >
        <Text style={ZAP_GRADIENT_WEB}>Zap</Text>
        <Text style={TAB_GRADIENT_WEB}>Tab</Text>
      </Text>
    );
  }

  return (
    <View
      accessibilityLabel="ZapTab"
      accessibilityRole="text"
      style={[{ alignItems: "center", justifyContent: "center" }, style]}
    >
      <NativeGradientWordmark fontSize={fontSize} />
    </View>
  );
}

function NativeGradientWordmark({ fontSize }: { fontSize: number }) {
  const height = Math.ceil(fontSize * 1.3);
  const width = Math.ceil(fontSize * 4.4);
  const baseline = fontSize * 1.02;
  const fontFamily = Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "sans-serif",
  });

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="zapTabZap" x1="0" y1="0" x2="0" y2="1">
          {ZAP_STOPS.map((stop) => (
            <Stop
              key={`zap-${stop.offset}`}
              offset={stop.offset}
              stopColor={stop.color}
            />
          ))}
        </LinearGradient>
        <LinearGradient id="zapTabTab" x1="0" y1="0" x2="0" y2="1">
          {TAB_STOPS.map((stop) => (
            <Stop
              key={`tab-${stop.offset}`}
              offset={stop.offset}
              stopColor={stop.color}
            />
          ))}
        </LinearGradient>
        <Mask id="zapTabMask">
          <SvgText
            x={width / 2}
            y={baseline}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight="800"
            fontFamily={fontFamily}
            fill="#ffffff"
            letterSpacing={-0.5}
          >
            ZapTab
          </SvgText>
        </Mask>
      </Defs>

      {/* Drop shadow */}
      <SvgText
        x={width / 2}
        y={baseline + 2}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="800"
        fontFamily={fontFamily}
        fill="rgba(0, 0, 0, 0.6)"
        letterSpacing={-0.5}
      >
        ZapTab
      </SvgText>

      {/* Gradient Masked Wordmark */}
      <G mask="url(#zapTabMask)">
        <Rect x="0" y="0" width={width * 0.49} height={height} fill="url(#zapTabZap)" />
        <Rect x={width * 0.49} y="0" width={width * 0.51} height={height} fill="url(#zapTabTab)" />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
});
