import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
  Easing,
} from "react-native";
import * as Clipboard from "expo-clipboard";

const Haptics = {
  impactAsync: () => {},
  notificationAsync: () => {},
  ImpactFeedbackStyle: { Light: null, Medium: null },
  NotificationFeedbackType: { Success: null, Error: null },
};

const API_URL = "https://attitude-triangle-tinsel.ngrok-free.dev";

const THEME = {
  bg: "#080C08",
  bgSecondary: "#0D120D",
  card: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.08)",
  cardBorderHighlight: "rgba(37,211,102,0.3)",
  text: "#F0F7F0",
  textSecondary: "#6B8F6B",
  textTertiary: "#3D5C3D",
  accent: "#25D366",
  accentDim: "rgba(37,211,102,0.12)",
  inputBg: "rgba(255,255,255,0.03)",
  divider: "rgba(255,255,255,0.06)",
  headerBg: "rgba(8,12,8,0.98)",
  verdictTrue: "#25D366",
  verdictFalse: "#FF4444",
  verdictMisleading: "#FFB800",
  verdictUnverified: "#6B8F6B",
};

const VERDICT_CONFIG = {
  TRUE: { color: THEME.verdictTrue, label: "VERIFIED TRUE", glow: "rgba(37,211,102,0.15)" },
  FALSE: { color: THEME.verdictFalse, label: "LIKELY FALSE", glow: "rgba(255,68,68,0.15)" },
  MISLEADING: { color: THEME.verdictMisleading, label: "MISLEADING", glow: "rgba(255,184,0,0.15)" },
  UNVERIFIED: { color: THEME.verdictUnverified, label: "UNVERIFIED", glow: "rgba(107,143,107,0.15)" },
};

// ── Scan Line ──────────────────────────────────────────────────────────────
function ScanLine({ height }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height - 2],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: THEME.accent,
        opacity: 0.6,
        shadowColor: THEME.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        transform: [{ translateY }],
      }}
    />
  );
}

// ── Trust Score Counter ────────────────────────────────────────────────────
function TrustScore({ value, color }) {
  const [display, setDisplay] = useState(0);
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: value,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const listener = animVal.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => animVal.removeListener(listener);
  }, [value]);

  return (
    <Text style={[styles.trustScore, { color }]}>
      {display}<Text style={styles.trustScoreUnit}>%</Text>
    </Text>
  );
}

// ── Animated Bar ───────────────────────────────────────────────────────────
function AnimatedBar({ confidence, color }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: confidence,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [confidence]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.barTrack}>
      <Animated.View
        style={[
          styles.barFill,
          { width, backgroundColor: color, shadowColor: color },
        ]}
      />
    </View>
  );
}

// ── Verdict Badge ──────────────────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 600, delay: 300, useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 600, delay: 300,
        easing: Easing.out(Easing.back(1.5)), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.verdictBadge,
        {
          borderColor: verdict.color + "60",
          backgroundColor: verdict.glow,
          shadowColor: verdict.color,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={[styles.verdictLabel, { color: verdict.color }]}>
        {verdict.label}
      </Text>
    </Animated.View>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputHeight, setInputHeight] = useState(140);
  const scrollRef = useRef(null);

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setMessage(text);
  };

  const checkMessage = async () => {
    if (!message.trim() || message.trim().length < 10) {
      setError("Message too short to analyse.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 500, animated: true }), 400);
    } catch (err) {
      setError("Could not reach the server. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setMessage(""); setResult(null); setError(null); };
  const verdict = result ? VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.UNVERIFIED : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <View style={styles.logoInner} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Misinfo Firewall</Text>
          <Text style={styles.headerSub}>AI-powered fact verification</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>VERIFY A CLAIM</Text>
          <Text style={styles.pageTitle}>Paste a message{"\n"}to analyse</Text>
        </View>

        {/* Input Card */}
        <View style={[styles.card, loading && styles.cardActive]}>
          <View style={styles.inputTopRow}>
            <Text style={styles.inputLabel}>Message</Text>
            <TouchableOpacity onPress={pasteFromClipboard} style={styles.pasteBtn}>
              <Text style={styles.pasteBtnText}>Paste from clipboard</Text>
            </TouchableOpacity>
          </View>

          <View
            style={styles.inputWrap}
            onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
          >
            <TextInput
              style={styles.input}
              placeholder="Forward the message here..."
              placeholderTextColor={THEME.textTertiary}
              multiline
              value={message}
              onChangeText={(t) => { setMessage(t); setError(null); }}
              maxLength={2000}
            />
            {loading && <ScanLine height={inputHeight} />}
          </View>

          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{message.length} / 2000</Text>
            {loading && <Text style={styles.scanningLabel}>Scanning</Text>}
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.checkBtn,
              (!message.trim() || loading) && styles.checkBtnDisabled,
            ]}
            onPress={checkMessage}
            disabled={loading || !message.trim()}
          >
            {loading ? (
              <View style={styles.checkBtnInner}>
                <ActivityIndicator color={THEME.accent} size="small" />
                <Text style={[styles.checkBtnText, { color: THEME.accent }]}>Analysing</Text>
              </View>
            ) : (
              <Text style={styles.checkBtnText}>Run Analysis</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Result Card */}
        {result && verdict && (
          <View
            style={[
              styles.resultCard,
              { borderColor: verdict.color + "30", shadowColor: verdict.color },
            ]}
          >
            {/* Color strip at top */}
            <View style={[styles.resultStrip, { backgroundColor: verdict.color }]} />

            <View style={styles.resultContent}>

              {/* Verdict + Score */}
              <View style={styles.verdictRow}>
                <VerdictBadge verdict={verdict} />
                <TrustScore value={result.confidence} color={verdict.color} />
              </View>

              {/* Confidence bar */}
              <View style={styles.barSection}>
                <Text style={styles.fieldLabel}>CONFIDENCE</Text>
                <AnimatedBar confidence={result.confidence} color={verdict.color} />
              </View>

              <View style={styles.divider} />

              {/* Analysis */}
              <Text style={styles.fieldLabel}>ANALYSIS</Text>
              <Text style={styles.bodyText}>{result.summary}</Text>

              {/* Red Flags as chips */}
              {result.red_flags?.length > 0 && (
                <View style={styles.block}>
                  <Text style={styles.fieldLabel}>RED FLAGS</Text>
                  <View style={styles.chipsRow}>
                    {result.red_flags.map((flag, i) => (
                      <View key={i} style={styles.flagChip}>
                        <Text style={styles.flagChipText}>{flag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.divider} />

              {/* Recommendation */}
              <Text style={styles.fieldLabel}>RECOMMENDATION</Text>
              <Text style={styles.bodyText}>{result.advice}</Text>

              {/* Credible Sources */}
              {result.credible_sources?.length > 0 && (
                <View style={styles.block}>
                  <Text style={styles.fieldLabel}>CREDIBLE SOURCES</Text>
                  {result.credible_sources.map((src, i) => (
                    <View key={i} style={styles.sourceCard}>
                      <Text style={styles.sourceName}>{src.name}</Text>
                      <Text style={styles.sourceUrl} numberOfLines={1}>{src.url}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Fact Check DB */}
              {result.sources?.length > 0 && (
                <View style={styles.block}>
                  <Text style={styles.fieldLabel}>FACT-CHECK DATABASE</Text>
                  {result.sources.map((src, i) => (
                    <View key={i} style={styles.sourceCard}>
                      <View style={styles.sourceTopRow}>
                        <Text style={styles.sourceName}>{src.publisher}</Text>
                        <View style={[styles.ratingPill, { borderColor: verdict.color + "50" }]}>
                          <Text style={[styles.ratingText, { color: verdict.color }]}>{src.rating}</Text>
                        </View>
                      </View>
                      <Text style={styles.sourceUrl} numberOfLines={2}>{src.text}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.resetBtn} onPress={reset}>
                <Text style={styles.resetBtnText}>Analyse Another Message</Text>
              </TouchableOpacity>

            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },

  // Header
  header: {
    paddingTop: Platform.OS === "android" ? 52 : 60,
    paddingBottom: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.divider,
    backgroundColor: THEME.headerBg,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: THEME.accentDim,
    borderWidth: 1,
    borderColor: THEME.accent + "35",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    width: 17,
    height: 17,
    borderRadius: 5,
    backgroundColor: THEME.accent,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: THEME.text,
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    letterSpacing: 0.4,
    marginTop: 2,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 36, gap: 20 },

  // Page header
  pageHeader: { gap: 6 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.accent,
    letterSpacing: 2,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: THEME.text,
    letterSpacing: -0.5,
    lineHeight: 36,
  },

  // Card
  card: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    gap: 14,
  },
  cardActive: {
    borderColor: THEME.cardBorderHighlight,
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },

  // Input
  inputTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textSecondary,
    letterSpacing: 0.4,
  },
  pasteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: THEME.accentDim,
    borderWidth: 1,
    borderColor: THEME.accent + "25",
  },
  pasteBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.accent,
    letterSpacing: 0.2,
  },
  inputWrap: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    backgroundColor: THEME.inputBg,
  },
  input: {
    padding: 16,
    fontSize: 15,
    color: THEME.text,
    textAlignVertical: "top",
    lineHeight: 24,
    minHeight: 140,
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -6,
  },
  charCount: { fontSize: 11, color: THEME.textTertiary, letterSpacing: 0.3 },
  scanningLabel: {
    fontSize: 11,
    color: THEME.accent,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  errorBox: {
    backgroundColor: "rgba(255,68,68,0.08)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,68,68,0.25)",
  },
  errorText: { fontSize: 13, color: "#FF5555", fontWeight: "500" },
  checkBtn: {
    backgroundColor: THEME.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 2,
  },
  checkBtnDisabled: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: THEME.accent + "25",
  },
  checkBtnInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkBtnText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Result
  resultCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: THEME.card,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 12,
  },
  resultStrip: { height: 3 },
  resultContent: { padding: 22, gap: 18 },

  verdictRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verdictBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  verdictLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  trustScore: {
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: -2,
  },
  trustScoreUnit: {
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: 0,
  },

  barSection: { gap: 8 },
  barTrack: {
    height: 4,
    backgroundColor: THEME.divider,
    borderRadius: 100,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 100,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  divider: { height: 1, backgroundColor: THEME.divider },

  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.textSecondary,
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 14,
    color: THEME.text,
    lineHeight: 24,
    letterSpacing: 0.1,
  },

  block: { gap: 8 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flagChip: {
    backgroundColor: "rgba(255,68,68,0.08)",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,68,68,0.2)",
  },
  flagChipText: {
    fontSize: 12,
    color: "#FF6666",
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  sourceCard: {
    backgroundColor: THEME.inputBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    gap: 4,
    marginBottom: 8,
  },
  sourceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sourceName: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.accent,
    letterSpacing: 0.2,
  },
  sourceUrl: {
    fontSize: 12,
    color: THEME.textSecondary,
    letterSpacing: 0.1,
  },
  ratingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  ratingText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

  resetBtn: {
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  resetBtnText: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});