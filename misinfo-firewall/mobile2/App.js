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
  Dimensions,
  Linking,
  PanResponder,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Haptics = {
  impactAsync: () => {},
  notificationAsync: () => {},
  ImpactFeedbackStyle: { Light: null, Medium: null },
  NotificationFeedbackType: { Success: null, Error: null },
};

const API_URL = "https://attitude-triangle-tinsel.ngrok-free.dev";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HISTORY_KEY = "misinfo_history";

const THEME = {
  bg: "#080C08",
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
        Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, height - 2] });
  return (
    <Animated.View pointerEvents="none" style={{
      position: "absolute", left: 0, right: 0, height: 2,
      backgroundColor: THEME.accent, opacity: 0.6,
      shadowColor: THEME.accent, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1, shadowRadius: 10,
      transform: [{ translateY }],
    }} />
  );
}

// ── Trust Score Counter ────────────────────────────────────────────────────
function TrustScore({ value, color }) {
  const [display, setDisplay] = useState(0);
  const animVal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, { toValue: value, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
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
    Animated.timing(anim, { toValue: confidence, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [confidence]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { width, backgroundColor: color }]} />
    </View>
  );
}

// ── Verdict Badge ──────────────────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, delay: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 600, delay: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.verdictBadge, {
      borderColor: verdict.color + "60", backgroundColor: verdict.glow,
      shadowColor: verdict.color, opacity, transform: [{ translateY }],
    }]}>
      <Text style={[styles.verdictLabel, { color: verdict.color }]}>{verdict.label}</Text>
    </Animated.View>
  );
}

// ── Result Card ────────────────────────────────────────────────────────────
function ResultCard({ result, animated = true }) {
  const verdict = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.UNVERIFIED;
  return (
    <View style={[styles.resultCard, { borderColor: verdict.color + "30", shadowColor: verdict.color }]}>
      <View style={[styles.resultStrip, { backgroundColor: verdict.color }]} />
      <View style={styles.resultContent}>
        <View style={styles.verdictRow}>
          {animated ? <VerdictBadge verdict={verdict} /> : (
            <View style={[styles.verdictBadge, { borderColor: verdict.color + "60", backgroundColor: verdict.glow }]}>
              <Text style={[styles.verdictLabel, { color: verdict.color }]}>{verdict.label}</Text>
            </View>
          )}
          {animated
            ? <TrustScore value={result.confidence} color={verdict.color} />
            : <Text style={[styles.trustScore, { color: verdict.color }]}>{result.confidence}<Text style={styles.trustScoreUnit}>%</Text></Text>
          }
        </View>

        <View style={styles.barSection}>
          <Text style={styles.fieldLabel}>CONFIDENCE</Text>
          {animated
            ? <AnimatedBar confidence={result.confidence} color={verdict.color} />
            : (
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${result.confidence}%`, backgroundColor: verdict.color }]} />
              </View>
            )
          }
        </View>

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>ANALYSIS</Text>
        <Text style={styles.bodyText}>{result.summary}</Text>

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

        <Text style={styles.fieldLabel}>RECOMMENDATION</Text>
        <Text style={styles.bodyText}>{result.advice}</Text>

        {result.credible_sources?.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.fieldLabel}>CREDIBLE SOURCES</Text>
            {result.credible_sources.map((src, i) => (
              <TouchableOpacity key={i} style={styles.sourceCard} onPress={() => {
                if (src.url && src.url.startsWith("http")) Linking.openURL(src.url);
              }}>
                <Text style={styles.sourceName}>{src.name}</Text>
                <Text style={[styles.sourceUrl, { color: THEME.accent }]} numberOfLines={1}>{src.url}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {result.sources?.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.fieldLabel}>FACT-CHECK DATABASE</Text>
            {result.sources.map((src, i) => (
              <TouchableOpacity key={i} style={styles.sourceCard} onPress={() => {
                if (src.url && src.url.startsWith("http")) Linking.openURL(src.url);
              }}>
                <View style={styles.sourceTopRow}>
                  <Text style={styles.sourceName}>{src.publisher}</Text>
                  <View style={[styles.ratingPill, { borderColor: verdict.color + "50" }]}>
                    <Text style={[styles.ratingText, { color: verdict.color }]}>{src.rating}</Text>
                  </View>
                </View>
                <Text style={styles.sourceUrl} numberOfLines={2}>{src.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ── History Item ───────────────────────────────────────────────────────────
function HistoryItem({ item }) {
  const [expanded, setExpanded] = useState(false);
  const verdict = VERDICT_CONFIG[item.result.verdict] || VERDICT_CONFIG.UNVERIFIED;
  const date = new Date(item.timestamp);
  const timeStr = date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.historyItem, { borderColor: verdict.color + "30" }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.historyHeader}>
        <View style={styles.historyLeft}>
          <View style={[styles.historyDot, { backgroundColor: verdict.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.historyMessage} numberOfLines={expanded ? 0 : 2}>
              {item.message}
            </Text>
            <Text style={styles.historyTime}>{timeStr}</Text>
          </View>
        </View>
        <View style={styles.historyRight}>
          <Text style={[styles.historyVerdict, { color: verdict.color }]}>
            {item.result.confidence}%
          </Text>
          <Text style={[styles.historyExpand, { color: THEME.textTertiary }]}>
            {expanded ? "▲" : "▼"}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.historyExpanded}>
          <View style={[styles.divider, { marginBottom: 12 }]} />
          <ResultCard result={item.result} animated={false} />
        </View>
      )}
    </View>
  );
}

// ── Home Screen ────────────────────────────────────────────────────────────
function HomeScreen({ onNewResult }) {
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
      onNewResult({ message: message.trim(), result: data, timestamp: new Date().toISOString() });
      setTimeout(() => scrollRef.current?.scrollTo({ y: 500, animated: true }), 400);
    } catch (err) {
      setError("Could not reach the server. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setMessage(""); setResult(null); setError(null); };

  return (
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      <View style={styles.pageHeader}>
        <Text style={styles.eyebrow}>VERIFY A CLAIM</Text>
        <Text style={styles.pageTitle}>Paste a message{"\n"}to analyse</Text>
      </View>

      <View style={[styles.card, loading && styles.cardActive]}>
        <View style={styles.inputTopRow}>
          <Text style={styles.inputLabel}>Message</Text>
          <TouchableOpacity onPress={pasteFromClipboard} style={styles.pasteBtn}>
            <Text style={styles.pasteBtnText}>Paste from clipboard</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrap} onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}>
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
          {loading && <Text style={styles.scanningLabel}>SCANNING</Text>}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.checkBtn, (!message.trim() || loading) && styles.checkBtnDisabled]}
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

      {result && (
        <>
          <ResultCard result={result} animated={true} />
          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <Text style={styles.resetBtnText}>Analyse Another Message</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

// ── History Screen ─────────────────────────────────────────────────────────
function HistoryScreen({ history, onClear }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>

      <View style={styles.pageHeader}>
        <Text style={styles.eyebrow}>PAST CHECKS</Text>
        <View style={styles.historyTitleRow}>
          <Text style={styles.pageTitle}>History</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No checks yet</Text>
          <Text style={styles.emptySubtitle}>Fact-checked messages will appear here</Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {history.map((item, i) => (
            <HistoryItem key={i} item={item} />
          ))}
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

// ── Main App with Swipe ────────────────────────────────────────────────────
export default function App() {
  const [activeScreen, setActiveScreen] = useState(0); // 0 = home, 1 = history
  const [history, setHistory] = useState([]);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Load history from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((data) => {
      if (data) setHistory(JSON.parse(data));
    });
  }, []);

  const saveHistory = async (newHistory) => {
    setHistory(newHistory);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const onNewResult = (item) => {
    const newHistory = [item, ...history].slice(0, 50); // keep last 50
    saveHistory(newHistory);
  };

  const onClearHistory = () => saveHistory([]);

  const switchScreen = (index) => {
    setActiveScreen(index);
    Animated.spring(slideAnim, {
      toValue: -index * SCREEN_WIDTH,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  };

  // Swipe gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50 && activeScreen === 0) switchScreen(1);
        if (g.dx > 50 && activeScreen === 1) switchScreen(0);
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Misinfo Firewall</Text>
            <Text style={styles.headerSub}>AI-powered fact verification</Text>
          </View>
        </View>

        {/* Tab indicators */}
        <View style={styles.tabRow}>
          <TouchableOpacity onPress={() => switchScreen(0)} style={[styles.tab, activeScreen === 0 && styles.tabActive]}>
            <Text style={[styles.tabText, activeScreen === 0 && styles.tabTextActive]}>Check</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => switchScreen(1)} style={[styles.tab, activeScreen === 1 && styles.tabActive]}>
            <Text style={[styles.tabText, activeScreen === 1 && styles.tabTextActive]}>
              History {history.length > 0 && `(${history.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Swipeable screens */}
      <Animated.View style={[styles.screensContainer, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.screen}>
          <HomeScreen onNewResult={onNewResult} />
        </View>
        <View style={styles.screen}>
          <HistoryScreen history={history} onClear={onClearHistory} />
        </View>
      </Animated.View>

      {/* Bottom dot indicators */}
      <View style={styles.dotRow}>
        <TouchableOpacity onPress={() => switchScreen(0)}>
          <View style={[styles.dot, activeScreen === 0 && styles.dotActive]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => switchScreen(1)}>
          <View style={[styles.dot, activeScreen === 1 && styles.dotActive]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },

  // Header
  header: {
    paddingTop: Platform.OS === "android" ? 52 : 60,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: THEME.divider,
    backgroundColor: THEME.headerBg,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoMark: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: THEME.accentDim,
    borderWidth: 1, borderColor: THEME.accent + "35",
    alignItems: "center", justifyContent: "center",
  },
  logoInner: { width: 15, height: 15, borderRadius: 4, backgroundColor: THEME.accent },
  headerTitle: { fontSize: 15, fontWeight: "700", color: THEME.text, letterSpacing: 0.2 },
  headerSub: { fontSize: 10, color: THEME.textSecondary, letterSpacing: 0.4, marginTop: 1 },

  // Tabs
  tabRow: { flexDirection: "row", gap: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tabActive: { backgroundColor: THEME.accentDim },
  tabText: { fontSize: 13, color: THEME.textSecondary, fontWeight: "600" },
  tabTextActive: { color: THEME.accent },

  // Screens
  screensContainer: { flex: 1, flexDirection: "row", width: SCREEN_WIDTH * 2 },
  screen: { width: SCREEN_WIDTH, flex: 1 },

  // Dots
  dotRow: {
    flexDirection: "row", justifyContent: "center", gap: 6,
    paddingVertical: 12, backgroundColor: THEME.bg,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.textTertiary },
  dotActive: { backgroundColor: THEME.accent, width: 18 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 32, gap: 20 },

  // Page header
  pageHeader: { gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: "700", color: THEME.accent, letterSpacing: 2 },
  pageTitle: { fontSize: 28, fontWeight: "800", color: THEME.text, letterSpacing: -0.5, lineHeight: 36 },

  // Card
  card: {
    backgroundColor: THEME.card, borderRadius: 22,
    padding: 20, borderWidth: 1, borderColor: THEME.cardBorder, gap: 14,
  },
  cardActive: { borderColor: THEME.cardBorderHighlight },

  // Input
  inputTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  inputLabel: { fontSize: 13, fontWeight: "600", color: THEME.textSecondary, letterSpacing: 0.4 },
  pasteBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9,
    backgroundColor: THEME.accentDim, borderWidth: 1, borderColor: THEME.accent + "25",
  },
  pasteBtnText: { fontSize: 12, fontWeight: "600", color: THEME.accent },
  inputWrap: {
    position: "relative", borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: THEME.cardBorder, backgroundColor: THEME.inputBg,
  },
  input: { padding: 16, fontSize: 15, color: THEME.text, textAlignVertical: "top", lineHeight: 24, minHeight: 140 },
  inputFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: -6 },
  charCount: { fontSize: 11, color: THEME.textTertiary },
  scanningLabel: { fontSize: 11, color: THEME.accent, fontWeight: "700", letterSpacing: 1.5 },
  errorBox: {
    backgroundColor: "rgba(255,68,68,0.08)", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "rgba(255,68,68,0.25)",
  },
  errorText: { fontSize: 13, color: "#FF5555", fontWeight: "500" },
  checkBtn: { backgroundColor: THEME.accent, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 2 },
  checkBtnDisabled: { backgroundColor: "transparent", borderWidth: 1, borderColor: THEME.accent + "25" },
  checkBtnInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkBtnText: { color: "#000", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },

  // Result
  resultCard: {
    borderRadius: 22, borderWidth: 1, overflow: "hidden",
    backgroundColor: THEME.card, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 32, elevation: 12,
  },
  resultStrip: { height: 3 },
  resultContent: { padding: 22, gap: 18 },
  verdictRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  verdictBadge: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, borderWidth: 1,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 14,
  },
  verdictLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1.8 },
  trustScore: { fontSize: 52, fontWeight: "800", letterSpacing: -2 },
  trustScoreUnit: { fontSize: 26, fontWeight: "600" },
  barSection: { gap: 8 },
  barTrack: { height: 4, backgroundColor: THEME.divider, borderRadius: 100, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 100 },
  divider: { height: 1, backgroundColor: THEME.divider },
  fieldLabel: { fontSize: 10, fontWeight: "700", color: THEME.textSecondary, letterSpacing: 1.8, marginBottom: 6 },
  bodyText: { fontSize: 14, color: THEME.text, lineHeight: 24, letterSpacing: 0.1 },
  block: { gap: 8 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flagChip: {
    backgroundColor: "rgba(255,68,68,0.08)", borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(255,68,68,0.2)",
  },
  flagChipText: { fontSize: 12, color: "#FF6666", fontWeight: "600" },
  sourceCard: {
    backgroundColor: THEME.inputBg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: THEME.cardBorder, gap: 4, marginBottom: 8,
  },
  sourceTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sourceName: { fontSize: 13, fontWeight: "700", color: THEME.accent },
  sourceUrl: { fontSize: 12, color: THEME.textSecondary },
  ratingPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  ratingText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  resetBtn: {
    borderWidth: 1, borderColor: THEME.cardBorder, borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  resetBtnText: { color: THEME.textSecondary, fontSize: 14, fontWeight: "600", letterSpacing: 0.3 },

  // History
  historyTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clearBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: "rgba(255,68,68,0.08)", borderWidth: 1, borderColor: "rgba(255,68,68,0.2)",
  },
  clearBtnText: { fontSize: 12, color: "#FF6666", fontWeight: "600" },
  historyList: { gap: 12 },
  historyItem: {
    backgroundColor: THEME.card, borderRadius: 16,
    borderWidth: 1, overflow: "hidden",
  },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, gap: 12 },
  historyLeft: { flexDirection: "row", gap: 12, flex: 1 },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  historyMessage: { fontSize: 14, color: THEME.text, lineHeight: 20, flex: 1 },
  historyTime: { fontSize: 11, color: THEME.textTertiary, marginTop: 4, letterSpacing: 0.3 },
  historyRight: { alignItems: "flex-end", gap: 4 },
  historyVerdict: { fontSize: 15, fontWeight: "800" },
  historyExpand: { fontSize: 10 },
  historyExpanded: { paddingHorizontal: 16, paddingBottom: 16 },

  // Empty state
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: THEME.textSecondary },
  emptySubtitle: { fontSize: 14, color: THEME.textTertiary, textAlign: "center" },
});