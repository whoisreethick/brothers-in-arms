import { useState } from "react";
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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

// 🔁 Replace this with your deployed GCP Cloud Function URL later
// For now we use localhost for testing
const API_URL = "https://attitude-triangle-tinsel.ngrok-free.dev";
// const API_URL = "http://localhost:8080"; // iOS simulator

const VERDICT_CONFIG = {
  TRUE: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#86efac",
    emoji: "✅",
    label: "Likely True",
  },
  FALSE: {
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
    emoji: "❌",
    label: "Likely False",
  },
  MISLEADING: {
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
    emoji: "⚠️",
    label: "Misleading",
  },
  UNVERIFIED: {
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#d1d5db",
    emoji: "🔍",
    label: "Unverified",
  },
};

export default function App() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setMessage(text);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const checkMessage = async () => {
    if (!message.trim() || message.trim().length < 10) {
      setError("Please enter a longer message to fact-check.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError("Could not reach the server. Make sure backend is running.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessage("");
    setResult(null);
    setError(null);
  };

  const verdict = result ? VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.UNVERIFIED : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🛡️</Text>
        <Text style={styles.headerTitle}>Misinfo Firewall</Text>
        <Text style={styles.headerSub}>Fact-check WhatsApp forwards instantly</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Input card */}
        <View style={styles.card}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputLabel}>Paste a message to check</Text>
            <TouchableOpacity onPress={pasteFromClipboard} style={styles.pasteBtn}>
              <Text style={styles.pasteBtnText}>📋 Paste</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Paste the WhatsApp forward here..."
            placeholderTextColor="#9ca3af"
            multiline
            value={message}
            onChangeText={(t) => { setMessage(t); setError(null); }}
            maxLength={2000}
          />

          <Text style={styles.charCount}>{message.length}/2000</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.checkBtn, (loading || !message.trim()) && styles.checkBtnDisabled]}
            onPress={checkMessage}
            disabled={loading || !message.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkBtnText}>🔍 Check this message</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Loading state */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Analysing with AI + fact databases...</Text>
            <Text style={styles.loadingSubText}>Usually under 5 seconds</Text>
          </View>
        )}

        {/* Result card */}
        {result && verdict && (
          <View style={[styles.resultCard, { borderColor: verdict.border, backgroundColor: verdict.bg }]}>

            {/* Verdict badge */}
            <View style={[styles.verdictBadge, { backgroundColor: verdict.color }]}>
              <Text style={styles.verdictEmoji}>{verdict.emoji}</Text>
              <Text style={styles.verdictLabel}>{verdict.label}</Text>
            </View>

            {/* Confidence bar */}
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>Confidence</Text>
              <Text style={[styles.confidenceValue, { color: verdict.color }]}>
                {result.confidence}%
              </Text>
            </View>
            <View style={styles.confidenceBarBg}>
              <View
                style={[
                  styles.confidenceBarFill,
                  { width: `${result.confidence}%`, backgroundColor: verdict.color },
                ]}
              />
            </View>

            {/* Summary */}
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{result.summary}</Text>

            {/* Red flags */}
            {result.red_flags?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>🚩 Red Flags</Text>
                {result.red_flags.map((flag, i) => (
                  <View key={i} style={styles.flagRow}>
                    <Text style={styles.flagDot}>•</Text>
                    <Text style={styles.flagText}>{flag}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Advice */}
            <View style={styles.adviceBox}>
              <Text style={styles.adviceText}>💡 {result.advice}</Text>
            </View>

            {/* Sources */}
            {result.sources?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>📰 Fact-check Sources</Text>
                {result.sources.map((src, i) => (
                  <View key={i} style={styles.sourceCard}>
                    <Text style={styles.sourcePublisher}>{src.publisher}</Text>
                    <Text style={styles.sourceRating}>Rating: {src.rating}</Text>
                    <Text style={styles.sourceClaim} numberOfLines={2}>{src.text}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Check another */}
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetBtnText}>Check another message</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? 48 : 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
  },
  headerEmoji: { fontSize: 36, marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1e293b" },
  headerSub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  pasteBtn: {
    backgroundColor: "#ede9fe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pasteBtnText: { fontSize: 13, color: "#6366f1", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    fontSize: 15,
    color: "#1e293b",
    textAlignVertical: "top",
    backgroundColor: "#f8fafc",
  },
  charCount: { fontSize: 11, color: "#9ca3af", textAlign: "right", marginTop: 4 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorText: { color: "#dc2626", fontSize: 13 },
  checkBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  checkBtnDisabled: { backgroundColor: "#c7d2fe" },
  checkBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  loadingText: { fontSize: 15, color: "#374151", fontWeight: "600" },
  loadingSubText: { fontSize: 13, color: "#9ca3af" },
  resultCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    gap: 12,
  },
  verdictBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 6,
  },
  verdictEmoji: { fontSize: 18 },
  verdictLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceLabel: { fontSize: 13, color: "#6b7280" },
  confidenceValue: { fontSize: 15, fontWeight: "700" },
  confidenceBarBg: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 100,
    overflow: "hidden",
  },
  confidenceBarFill: { height: "100%", borderRadius: 100 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#374151", marginTop: 4 },
  summaryText: { fontSize: 14, color: "#4b5563", lineHeight: 22 },
  flagRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  flagDot: { color: "#ef4444", fontSize: 16, marginTop: -2 },
  flagText: { fontSize: 14, color: "#4b5563", flex: 1 },
  adviceBox: {
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  adviceText: { fontSize: 14, color: "#92400e", lineHeight: 20 },
  sourceCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4,
  },
  sourcePublisher: { fontSize: 13, fontWeight: "700", color: "#374151" },
  sourceRating: { fontSize: 12, color: "#6b7280" },
  sourceClaim: { fontSize: 13, color: "#4b5563" },
  resetBtn: {
    borderWidth: 1,
    borderColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  resetBtnText: { color: "#6366f1", fontSize: 15, fontWeight: "600" },
});