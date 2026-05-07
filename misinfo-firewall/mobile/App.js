// import { useState, useEffect, useRef } from "react";
// import {
//   StyleSheet,
//   Text,
//   View,
//   TextInput,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   StatusBar,
//   Platform,
//   Animated,
//   Switch,
// } from "react-native";
// import * as Clipboard from "expo-clipboard";

// const Haptics = {
//   impactAsync: () => {},
//   notificationAsync: () => {},
//   ImpactFeedbackStyle: { Light: null, Medium: null },
//   NotificationFeedbackType: { Success: null, Error: null },
// };

// const API_URL = "https://attitude-triangle-tinsel.ngrok-free.dev";

// const LIGHT = {
//   bg: "#F0F2F0",
//   card: "#FFFFFF",
//   border: "#E0E5E0",
//   text: "#1A1A1A",
//   subtext: "#6B7280",
//   input: "#F7F9F7",
//   accent: "#25D366",
//   accentDark: "#128C7E",
//   accentLight: "#DCF8C6",
//   headerBg: "#128C7E",
//   headerText: "#FFFFFF",
// };

// const DARK = {
//   bg: "#0A0F0A",
//   card: "#111811",
//   border: "#1E2E1E",
//   text: "#E8F5E9",
//   subtext: "#6B9E72",
//   input: "#0D150D",
//   accent: "#25D366",
//   accentDark: "#128C7E",
//   accentLight: "#1B3A22",
//   headerBg: "#0D1F0D",
//   headerText: "#25D366",
// };

// const VERDICT_CONFIG = {
//   TRUE: { color: "#25D366", label: "Likely True", bar: "#25D366" },
//   FALSE: { color: "#E53E3E", label: "Likely False", bar: "#E53E3E" },
//   MISLEADING: { color: "#D97706", label: "Misleading", bar: "#D97706" },
//   UNVERIFIED: { color: "#6B7280", label: "Unverified", bar: "#6B7280" },
// };

// function AnimatedBar({ confidence, color, theme }) {
//   const anim = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.timing(anim, {
//       toValue: confidence,
//       duration: 900,
//       useNativeDriver: false,
//     }).start();
//   }, [confidence]);

//   const width = anim.interpolate({
//     inputRange: [0, 100],
//     outputRange: ["0%", "100%"],
//   });

//   return (
//     <View style={[barStyles.track, { backgroundColor: theme.border }]}>
//       <Animated.View style={[barStyles.fill, { width, backgroundColor: color }]} />
//     </View>
//   );
// }

// const barStyles = StyleSheet.create({
//   track: { height: 6, borderRadius: 100, overflow: "hidden", marginTop: 6 },
//   fill: { height: "100%", borderRadius: 100 },
// });

// export default function App() {
//   const [message, setMessage] = useState("");
//   const [result, setResult] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [dark, setDark] = useState(true);
//   const theme = dark ? DARK : LIGHT;

//   const pasteFromClipboard = async () => {
//     const text = await Clipboard.getStringAsync();
//     if (text) setMessage(text);
//   };

//   const checkMessage = async () => {
//     if (!message.trim() || message.trim().length < 10) {
//       setError("Please enter a longer message to fact-check.");
//       return;
//     }
//     setLoading(true);
//     setError(null);
//     setResult(null);
//     try {
//       const res = await fetch(API_URL, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ message: message.trim() }),
//       });
//       if (!res.ok) throw new Error(`Server error: ${res.status}`);
//       const data = await res.json();
//       setResult(data);
//     } catch (err) {
//       setError("Could not reach the server. Make sure backend is running.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const reset = () => { setMessage(""); setResult(null); setError(null); };
//   const verdict = result ? VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.UNVERIFIED : null;

//   return (
//     <View style={[styles.container, { backgroundColor: theme.bg }]}>
//       <StatusBar
//         barStyle={dark ? "light-content" : "dark-content"}
//         backgroundColor={theme.headerBg}
//       />

//       {/* Header */}
//       <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
//         <View style={styles.headerLeft}>
//           <Text style={[styles.headerTitle, { color: theme.headerText }]}>Misinfo Firewall</Text>
//           <Text style={[styles.headerSub, { color: dark ? "#6B9E72" : "rgba(255,255,255,0.7)" }]}>
//             WhatsApp fact-checker
//           </Text>
//         </View>
//         <View style={styles.headerRight}>
//           <Text style={[styles.darkLabel, { color: dark ? "#6B9E72" : "rgba(255,255,255,0.7)" }]}>
//             {dark ? "Dark" : "Light"}
//           </Text>
//           <Switch
//             value={dark}
//             onValueChange={setDark}
//             trackColor={{ false: "#ccc", true: "#128C7E" }}
//             thumbColor={dark ? "#25D366" : "#fff"}
//           />
//         </View>
//       </View>

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         keyboardShouldPersistTaps="handled"
//       >
//         {/* Input card */}
//         <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
//           <View style={styles.inputHeader}>
//             <Text style={[styles.inputLabel, { color: theme.text }]}>Message to verify</Text>
//             <TouchableOpacity onPress={pasteFromClipboard} style={[styles.pasteBtn, { backgroundColor: theme.accentLight }]}>
//               <Text style={[styles.pasteBtnText, { color: theme.accent }]}>Paste</Text>
//             </TouchableOpacity>
//           </View>

//           <TextInput
//             style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
//             placeholder="Paste the WhatsApp forward here..."
//             placeholderTextColor={theme.subtext}
//             multiline
//             value={message}
//             onChangeText={(t) => { setMessage(t); setError(null); }}
//             maxLength={2000}
//           />

//           <Text style={[styles.charCount, { color: theme.subtext }]}>{message.length} / 2000</Text>

//           {error && (
//             <View style={[styles.errorBox, { backgroundColor: dark ? "#2A1010" : "#FEF2F2", borderColor: "#FCA5A5" }]}>
//               <Text style={[styles.errorText, { color: "#E53E3E" }]}>{error}</Text>
//             </View>
//           )}

//           <TouchableOpacity
//             style={[
//               styles.checkBtn,
//               { backgroundColor: theme.accent },
//               (loading || !message.trim()) && { backgroundColor: dark ? "#1A3D25" : "#A7F3C8" },
//             ]}
//             onPress={checkMessage}
//             disabled={loading || !message.trim()}
//           >
//             {loading ? (
//               <ActivityIndicator color="#fff" />
//             ) : (
//               <Text style={styles.checkBtnText}>Verify Message</Text>
//             )}
//           </TouchableOpacity>
//         </View>

//         {/* Loading */}
//         {loading && (
//           <View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
//             <ActivityIndicator size="large" color={theme.accent} />
//             <Text style={[styles.loadingText, { color: theme.text }]}>Analysing with AI + fact databases</Text>
//             <Text style={[styles.loadingSubText, { color: theme.subtext }]}>Usually under 5 seconds</Text>
//           </View>
//         )}

//         {/* Result */}
//         {result && verdict && (
//           <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>

//             {/* Verdict badge */}
//             <View style={[styles.verdictBadge, { backgroundColor: verdict.color }]}>
//               <Text style={styles.verdictLabel}>{verdict.label}</Text>
//             </View>

//             {/* Confidence */}
//             <View style={styles.confidenceRow}>
//               <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Confidence</Text>
//               <Text style={[styles.confidenceValue, { color: verdict.color }]}>{result.confidence}%</Text>
//             </View>
//             <AnimatedBar confidence={result.confidence} color={verdict.color} theme={theme} />

//             <View style={[styles.divider, { backgroundColor: theme.border }]} />

//             {/* Summary */}
//             <Text style={[styles.sectionTitle, { color: theme.subtext }]}>SUMMARY</Text>
//             <Text style={[styles.summaryText, { color: theme.text }]}>{result.summary}</Text>

//             {/* Red flags */}
//             {result.red_flags?.length > 0 && (
//               <>
//                 <Text style={[styles.sectionTitle, { color: theme.subtext, marginTop: 16 }]}>RED FLAGS</Text>
//                 {result.red_flags.map((flag, i) => (
//                   <View key={i} style={styles.flagRow}>
//                     <View style={[styles.flagDot, { backgroundColor: "#E53E3E" }]} />
//                     <Text style={[styles.flagText, { color: theme.text }]}>{flag}</Text>
//                   </View>
//                 ))}
//               </>
//             )}

//             {/* Advice */}
//             <View style={[styles.adviceBox, { backgroundColor: theme.accentLight, borderColor: dark ? "#1E3A28" : "#86EFAC" }]}>
//               <Text style={[styles.adviceTitle, { color: theme.accent }]}>RECOMMENDATION</Text>
//               <Text style={[styles.adviceText, { color: dark ? "#A8D5B5" : "#166534" }]}>{result.advice}</Text>
//             </View>

//             {/* Sources */}
//             {result.sources?.length > 0 && (
//               <>
//                 <Text style={[styles.sectionTitle, { color: theme.subtext, marginTop: 4 }]}>FACT-CHECK SOURCES</Text>
//                 {result.sources.map((src, i) => (
//                   <View key={i} style={[styles.sourceCard, { backgroundColor: theme.input, borderColor: theme.border }]}>
//                     <Text style={[styles.sourcePublisher, { color: theme.accent }]}>{src.publisher}</Text>
//                     <Text style={[styles.sourceRating, { color: theme.subtext }]}>Rating: {src.rating}</Text>
//                     <Text style={[styles.sourceClaim, { color: theme.text }]} numberOfLines={2}>{src.text}</Text>
//                   </View>
//                 ))}
//               </>
//             )}

//             <TouchableOpacity style={[styles.resetBtn, { borderColor: theme.accent }]} onPress={reset}>
//               <Text style={[styles.resetBtnText, { color: theme.accent }]}>Check Another Message</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   header: {
//     paddingTop: Platform.OS === "android" ? 48 : 60,
//     paddingBottom: 18,
//     paddingHorizontal: 20,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "flex-end",
//   },
//   headerLeft: {},
//   headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
//   darkLabel: { fontSize: 12, fontWeight: "500" },
//   headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: 0.3 },
//   headerSub: { fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
//   scroll: { flex: 1 },
//   scrollContent: { padding: 16, gap: 14 },
//   card: {
//     borderRadius: 14,
//     padding: 18,
//     borderWidth: 1,
//   },
//   inputHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   inputLabel: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5 },
//   pasteBtn: {
//     paddingHorizontal: 14,
//     paddingVertical: 6,
//     borderRadius: 8,
//   },
//   pasteBtnText: { fontSize: 13, fontWeight: "700" },
//   input: {
//     borderWidth: 1,
//     borderRadius: 10,
//     padding: 14,
//     minHeight: 130,
//     fontSize: 15,
//     textAlignVertical: "top",
//     lineHeight: 22,
//   },
//   charCount: { fontSize: 11, textAlign: "right", marginTop: 6, letterSpacing: 0.3 },
//   errorBox: {
//     borderRadius: 8,
//     padding: 12,
//     marginTop: 10,
//     borderWidth: 1,
//   },
//   errorText: { fontSize: 13, fontWeight: "500" },
//   checkBtn: {
//     borderRadius: 10,
//     paddingVertical: 15,
//     alignItems: "center",
//     marginTop: 14,
//   },
//   checkBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
//   loadingCard: {
//     borderRadius: 14,
//     padding: 36,
//     alignItems: "center",
//     borderWidth: 1,
//     gap: 12,
//   },
//   loadingText: { fontSize: 15, fontWeight: "600" },
//   loadingSubText: { fontSize: 13 },
//   resultCard: {
//     borderRadius: 14,
//     padding: 18,
//     borderWidth: 1,
//     gap: 10,
//   },
//   verdictBadge: {
//     alignSelf: "flex-start",
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 6,
//   },
//   verdictLabel: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 1 },
//   confidenceRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginTop: 6,
//   },
//   sectionLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8 },
//   confidenceValue: { fontSize: 16, fontWeight: "800" },
//   divider: { height: 1, marginVertical: 4 },
//   sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 6 },
//   summaryText: { fontSize: 14, lineHeight: 22 },
//   flagRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 4 },
//   flagDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
//   flagText: { fontSize: 14, flex: 1, lineHeight: 22 },
//   adviceBox: {
//     borderRadius: 10,
//     padding: 14,
//     borderWidth: 1,
//     marginTop: 4,
//     gap: 4,
//   },
//   adviceTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
//   adviceText: { fontSize: 14, lineHeight: 20 },
//   sourceCard: {
//     borderRadius: 10,
//     padding: 12,
//     borderWidth: 1,
//     gap: 4,
//     marginBottom: 6,
//   },
//   sourcePublisher: { fontSize: 13, fontWeight: "700" },
//   sourceRating: { fontSize: 12 },
//   sourceClaim: { fontSize: 13, lineHeight: 18 },
//   resetBtn: {
//     borderWidth: 1.5,
//     borderRadius: 10,
//     paddingVertical: 13,
//     alignItems: "center",
//     marginTop: 6,
//   },
//   resetBtnText: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
// });


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
  Switch,
} from "react-native";
import * as Clipboard from "expo-clipboard";

const Haptics = {
  impactAsync: () => {},
  notificationAsync: () => {},
  ImpactFeedbackStyle: { Light: null, Medium: null },
  NotificationFeedbackType: { Success: null, Error: null },
};

const API_URL = "https://attitude-triangle-tinsel.ngrok-free.dev";

const LIGHT = {
  bg: "#F0F2F0",
  card: "#FFFFFF",
  border: "#E0E5E0",
  text: "#1A1A1A",
  subtext: "#6B7280",
  input: "#F7F9F7",
  accent: "#25D366",
  accentDark: "#128C7E",
  accentLight: "#DCF8C6",
  headerBg: "#128C7E",
  headerText: "#FFFFFF",
};

const DARK = {
  bg: "#0A0F0A",
  card: "#111811",
  border: "#1E2E1E",
  text: "#E8F5E9",
  subtext: "#6B9E72",
  input: "#0D150D",
  accent: "#25D366",
  accentDark: "#128C7E",
  accentLight: "#1B3A22",
  headerBg: "#0D1F0D",
  headerText: "#25D366",
};

const VERDICT_CONFIG = {
  TRUE: { color: "#25D366", label: "Likely True", bar: "#25D366" },
  FALSE: { color: "#E53E3E", label: "Likely False", bar: "#E53E3E" },
  MISLEADING: { color: "#D97706", label: "Misleading", bar: "#D97706" },
  UNVERIFIED: { color: "#6B7280", label: "Unverified", bar: "#6B7280" },
};

function AnimatedBar({ confidence, color, theme }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: confidence,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [confidence]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[barStyles.track, { backgroundColor: theme.border }]}>
      <Animated.View style={[barStyles.fill, { width, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 100, overflow: "hidden", marginTop: 6 },
  fill: { height: "100%", borderRadius: 100 },
});

export default function App() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dark, setDark] = useState(true);
  const theme = dark ? DARK : LIGHT;

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setMessage(text);
  };

  const checkMessage = async () => {
    if (!message.trim() || message.trim().length < 10) {
      setError("Please enter a longer message to fact-check.");
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
    } catch (err) {
      setError("Could not reach the server. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setMessage(""); setResult(null); setError(null); };
  const verdict = result ? VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.UNVERIFIED : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={dark ? "light-content" : "dark-content"}
        backgroundColor={theme.headerBg}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: theme.headerText }]}>Misinfo Firewall</Text>
          <Text style={[styles.headerSub, { color: dark ? "#6B9E72" : "rgba(255,255,255,0.7)" }]}>
            WhatsApp fact-checker
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.darkLabel, { color: dark ? "#6B9E72" : "rgba(255,255,255,0.7)" }]}>
            {dark ? "Dark" : "Light"}
          </Text>
          <Switch
            value={dark}
            onValueChange={setDark}
            trackColor={{ false: "#ccc", true: "#128C7E" }}
            thumbColor={dark ? "#25D366" : "#fff"}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Input card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.inputHeader}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Message to verify</Text>
            <TouchableOpacity onPress={pasteFromClipboard} style={[styles.pasteBtn, { backgroundColor: theme.accentLight }]}>
              <Text style={[styles.pasteBtnText, { color: theme.accent }]}>Paste</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            placeholder="Paste the WhatsApp forward here..."
            placeholderTextColor={theme.subtext}
            multiline
            value={message}
            onChangeText={(t) => { setMessage(t); setError(null); }}
            maxLength={2000}
          />

          <Text style={[styles.charCount, { color: theme.subtext }]}>{message.length} / 2000</Text>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: dark ? "#2A1010" : "#FEF2F2", borderColor: "#FCA5A5" }]}>
              <Text style={[styles.errorText, { color: "#E53E3E" }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.checkBtn,
              { backgroundColor: theme.accent },
              (loading || !message.trim()) && { backgroundColor: dark ? "#1A3D25" : "#A7F3C8" },
            ]}
            onPress={checkMessage}
            disabled={loading || !message.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkBtnText}>Verify Message</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && (
          <View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.text }]}>Analysing with AI + fact databases</Text>
            <Text style={[styles.loadingSubText, { color: theme.subtext }]}>Usually under 5 seconds</Text>
          </View>
        )}

        {/* Result */}
        {result && verdict && (
          <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>

            {/* Verdict badge */}
            <View style={[styles.verdictBadge, { backgroundColor: verdict.color }]}>
              <Text style={styles.verdictLabel}>{verdict.label}</Text>
            </View>

            {/* Confidence */}
            <View style={styles.confidenceRow}>
              <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Confidence</Text>
              <Text style={[styles.confidenceValue, { color: verdict.color }]}>{result.confidence}%</Text>
            </View>
            <AnimatedBar confidence={result.confidence} color={verdict.color} theme={theme} />

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Summary */}
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>SUMMARY</Text>
            <Text style={[styles.summaryText, { color: theme.text }]}>{result.summary}</Text>

            {/* Red flags */}
            {result.red_flags?.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.subtext, marginTop: 16 }]}>RED FLAGS</Text>
                {result.red_flags.map((flag, i) => (
                  <View key={i} style={styles.flagRow}>
                    <View style={[styles.flagDot, { backgroundColor: "#E53E3E" }]} />
                    <Text style={[styles.flagText, { color: theme.text }]}>{flag}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Advice */}
            <View style={[styles.adviceBox, { backgroundColor: theme.accentLight, borderColor: dark ? "#1E3A28" : "#86EFAC" }]}>
              <Text style={[styles.adviceTitle, { color: theme.accent }]}>RECOMMENDATION</Text>
              <Text style={[styles.adviceText, { color: dark ? "#A8D5B5" : "#166534" }]}>{result.advice}</Text>
            </View>

            {/* Sources */}
            {result.sources?.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.subtext, marginTop: 4 }]}>FACT-CHECK SOURCES</Text>
                {result.sources.map((src, i) => (
                  <View key={i} style={[styles.sourceCard, { backgroundColor: theme.input, borderColor: theme.border }]}>
                    <Text style={[styles.sourcePublisher, { color: theme.accent }]}>{src.publisher}</Text>
                    <Text style={[styles.sourceRating, { color: theme.subtext }]}>Rating: {src.rating}</Text>
                    <Text style={[styles.sourceClaim, { color: theme.text }]} numberOfLines={2}>{src.text}</Text>
                  </View>
                ))}
              </>
            )}

            <TouchableOpacity style={[styles.resetBtn, { borderColor: theme.accent }]} onPress={reset}>
              <Text style={[styles.resetBtnText, { color: theme.accent }]}>Check Another Message</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === "android" ? 48 : 60,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: {},
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  darkLabel: { fontSize: 12, fontWeight: "500" },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: 0.3 },
  headerSub: { fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  card: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  inputLabel: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5 },
  pasteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pasteBtnText: { fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    minHeight: 130,
    fontSize: 15,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  charCount: { fontSize: 11, textAlign: "right", marginTop: 6, letterSpacing: 0.3 },
  errorBox: {
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontWeight: "500" },
  checkBtn: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 14,
  },
  checkBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  loadingCard: {
    borderRadius: 14,
    padding: 36,
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
  },
  loadingText: { fontSize: 15, fontWeight: "600" },
  loadingSubText: { fontSize: 13 },
  resultCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    gap: 10,
  },
  verdictBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  verdictLabel: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  sectionLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8 },
  confidenceValue: { fontSize: 16, fontWeight: "800" },
  divider: { height: 1, marginVertical: 4 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 6 },
  summaryText: { fontSize: 14, lineHeight: 22 },
  flagRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 4 },
  flagDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  flagText: { fontSize: 14, flex: 1, lineHeight: 22 },
  adviceBox: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    marginTop: 4,
    gap: 4,
  },
  adviceTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  adviceText: { fontSize: 14, lineHeight: 20 },
  sourceCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    gap: 4,
    marginBottom: 6,
  },
  sourcePublisher: { fontSize: 13, fontWeight: "700" },
  sourceRating: { fontSize: 12 },
  sourceClaim: { fontSize: 13, lineHeight: 18 },
  resetBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
  },
  resetBtnText: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
});