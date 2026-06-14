import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { theme, radius, space } from '@/theme';

// Default backend host: EXPO_PUBLIC_API_HOST env override → dev LAN IP. The user
// can also change it at runtime in-app (persisted via AsyncStorage), so a stale
// IP on a phone demo is a 5-second fix instead of an Expo restart.
const DEFAULT_API_HOST = process.env.EXPO_PUBLIC_API_HOST ?? 'http://192.168.1.120:8000';
const HOST_STORAGE_KEY = 'apiHost';

// Tolerate bare IPs and trailing slashes the user types into the settings field.
function normalizeHost(raw: string): string {
  let h = raw.trim().replace(/\/+$/, '');
  if (h && !/^https?:\/\//i.test(h)) h = `http://${h}`;
  return h;
}

interface Result {
  success: boolean;
  translation: string;
  sample: {
    detected_language: string;
    raw_translation: string;
    symptoms: string;
    allergies: string;
    medications: string;
    past_medical_history: string;
    last_oral_intake: string;
    events: string;
  };
  transcription?: string;
  error?: string;
}

const NOT_MENTIONED = 'Not mentioned';

function hasValue(v?: string): boolean {
  return !!v && v.trim().length > 0;
}

// Plaintext handoff block a physician can read at a glance — also what we copy/share.
function formatHandoff(r: Result): string {
  const s = r.sample;
  const line = (label: string, v?: string) =>
    `${label}: ${hasValue(v) ? v!.trim() : NOT_MENTIONED}`;
  return [
    'IN-FLIGHT MEDICAL HANDOFF — SAMPLE SUMMARY',
    '(Auto-generated translation & extraction. Not a diagnosis.)',
    '',
    line('Detected language', s.detected_language),
    r.transcription ? line('Heard (original)', r.transcription) : null,
    line('English translation', s.raw_translation),
    '',
    'SAMPLE',
    line('S — Symptoms', s.symptoms),
    line('A — Allergies', s.allergies),
    line('M — Medications', s.medications),
    line('P — Past medical history', s.past_medical_history),
    line('L — Last oral intake', s.last_oral_intake),
    line('E — Events', s.events),
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export default function TranslatorScreen() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [connError, setConnError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Runtime-editable backend host
  const [apiHost, setApiHost] = useState(DEFAULT_API_HOST);
  const [hostDraft, setHostDraft] = useState(DEFAULT_API_HOST);
  const [showSettings, setShowSettings] = useState(false);
  const [hostStatus, setHostStatus] = useState<'unknown' | 'ok' | 'fail'>('unknown');

  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  // Ask for mic permission once and configure audio mode for recording
  useEffect(() => {
    (async () => {
      const status = await requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Microphone needed', 'Enable microphone access to use voice input.');
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
  }, []);

  // Hydrate a previously-saved host so the user only sets it once per device
  useEffect(() => {
    AsyncStorage.getItem(HOST_STORAGE_KEY).then((saved) => {
      if (saved) {
        setApiHost(saved);
        setHostDraft(saved);
      }
    });
  }, []);

  const testHost = async (h: string = apiHost) => {
    setHostStatus('unknown');
    try {
      const r = await fetch(`${h}/health`);
      setHostStatus(r.ok ? 'ok' : 'fail');
    } catch {
      setHostStatus('fail');
    }
  };

  const saveHost = async () => {
    const h = normalizeHost(hostDraft);
    setApiHost(h);
    setHostDraft(h);
    setConnError(false);
    await AsyncStorage.setItem(HOST_STORAGE_KEY, h);
    testHost(h);
  };

  const handleTranslate = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    setConnError(false);
    setLoading(true);
    setLoadingStage('Translating & extracting…');
    try {
      const response = await axios.post<Result>(`${apiHost}/translate`, { message });
      setResult(response.data);
    } catch (error) {
      setConnError(true);
      setResult(null);
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const startRecording = async () => {
    try {
      setResult(null);
      setConnError(false);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      Alert.alert('Error', 'Could not start recording');
      console.error(e);
    }
  };

  const stopRecordingAndTranscribe = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        Alert.alert('Error', 'No recording captured');
        return;
      }
      setConnError(false);
      setLoading(true);
      setLoadingStage('Transcribing speech & extracting…');
      // RN multipart upload — let fetch set the boundary, don't set Content-Type
      const formData = new FormData();
      formData.append('audio', { uri, name: 'recording.m4a', type: 'audio/m4a' } as any);
      const res = await fetch(`${apiHost}/transcribe`, { method: 'POST', body: formData });
      const data: Result = await res.json();
      setResult(data);
      if (!data.success) {
        Alert.alert('Heads up', data.error || 'Could not process audio');
      }
    } catch (e) {
      setConnError(true);
      setResult(null);
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleMicPress = () => {
    if (recorderState.isRecording) {
      stopRecordingAndTranscribe();
    } else {
      startRecording();
    }
  };

  const handleSpeak = (text: string) => {
    Speech.speak(text, { language: 'en' });
  };

  const handleCopy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(formatHandoff(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      await Share.share({ message: formatHandoff(result) });
    } catch (e) {
      console.error(e);
    }
  };

  const isRecording = recorderState.isRecording;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>In-Flight Medical Translator</Text>
            <Text style={styles.subtitle}>Speak or type in any language — it auto-detects.</Text>
            <TouchableOpacity
              style={styles.guideLink}
              onPress={() => router.push('/first-response')}
              activeOpacity={0.8}
            >
              <Ionicons name="medkit-outline" size={16} color={theme.accent} />
              <Text style={styles.guideLinkText}>First Response Guide</Text>
            </TouchableOpacity>
          </View>

          {/* Voice input */}
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonRecording]}
            onPress={handleMicPress}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={34}
              color={theme.bg}
            />
            <Text style={styles.micLabel}>
              {isRecording ? 'Recording… tap to stop' : 'Tap to speak'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or type</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Text input */}
          <TextInput
            style={styles.input}
            placeholder="Enter message in any language…"
            placeholderTextColor={theme.textFaint}
            multiline
            value={message}
            onChangeText={setMessage}
            editable={!loading && !isRecording}
          />
          <TouchableOpacity
            style={[styles.primaryButton, (loading || isRecording) && styles.buttonDisabled]}
            onPress={handleTranslate}
            disabled={loading || isRecording}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={theme.bg} />
            ) : (
              <Text style={styles.primaryButtonText}>Translate &amp; Extract</Text>
            )}
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.accent} />
              <Text style={styles.loadingText}>{loadingStage || 'Processing…'}</Text>
            </View>
          )}

          {/* Backend unreachable — the most common live-demo failure */}
          {connError && (
            <View style={styles.connBanner}>
              <View style={styles.connBannerHeader}>
                <Ionicons name="warning-outline" size={18} color={theme.danger} />
                <Text style={styles.connBannerTitle}>Can't reach the backend</Text>
              </View>
              <Text style={styles.connBannerText}>
                Tried {apiHost}. Make sure the FastAPI server is running and the device is on the
                same network — or change the address under Backend below.
              </Text>
            </View>
          )}

          {/* Results */}
          {result && result.success && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeader}>
                <Text style={styles.sectionTitle}>Results</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleCopy} activeOpacity={0.8}>
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={15}
                      color={theme.accent}
                    />
                    <Text style={styles.actionButtonText}>{copied ? 'Copied' : 'Copy'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.8}>
                    <Ionicons name="share-outline" size={15} color={theme.accent} />
                    <Text style={styles.actionButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {result.transcription ? (
                <ResultField label="Heard (transcription)" value={result.transcription} />
              ) : null}

              <ResultField label="Detected Language" value={result.sample.detected_language} />
              <ResultField
                label="English Translation"
                value={result.sample.raw_translation}
                onSpeak={() => handleSpeak(result.sample.raw_translation)}
              />

              <Text style={styles.subsectionTitle}>SAMPLE Clinical Summary</Text>
              <ResultField label="Symptoms" value={result.sample.symptoms} />
              <ResultField label="Allergies" value={result.sample.allergies} />
              <ResultField label="Medications" value={result.sample.medications} />
              <ResultField label="Past Medical History" value={result.sample.past_medical_history} />
              <ResultField label="Last Oral Intake" value={result.sample.last_oral_intake} />
              <ResultField label="Events" value={result.sample.events} />
            </View>
          )}

          {result && !result.success && (
            <Text style={styles.error}>Error: {result.error}</Text>
          )}

          {/* Backend host — editable at runtime so a stale IP never breaks a demo */}
          <View style={styles.settingsBlock}>
            <TouchableOpacity
              style={styles.settingsToggle}
              onPress={() => setShowSettings((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={styles.settingsToggleLeft}>
                <Ionicons name="settings-outline" size={16} color={theme.textDim} />
                <Text style={styles.settingsToggleText}>
                  Backend: {apiHost.replace(/^https?:\/\//, '')}
                </Text>
              </View>
              <Ionicons
                name={showSettings ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.textFaint}
              />
            </TouchableOpacity>
            {showSettings && (
              <View style={styles.settingsBody}>
                <TextInput
                  style={styles.hostInput}
                  value={hostDraft}
                  onChangeText={setHostDraft}
                  placeholder="http://192.168.1.120:8000"
                  placeholderTextColor={theme.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!loading}
                />
                <View style={styles.settingsActions}>
                  <TouchableOpacity style={styles.smallPrimary} onPress={saveHost} disabled={loading} activeOpacity={0.85}>
                    <Text style={styles.smallPrimaryText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallOutline} onPress={() => testHost()} disabled={loading} activeOpacity={0.85}>
                    <Text style={styles.smallOutlineText}>Test</Text>
                  </TouchableOpacity>
                  {hostStatus !== 'unknown' && (
                    <View style={styles.hostStatusRow}>
                      <Ionicons
                        name={hostStatus === 'ok' ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={hostStatus === 'ok' ? theme.success : theme.danger}
                      />
                      <Text
                        style={[
                          styles.hostStatusText,
                          { color: hostStatus === 'ok' ? theme.success : theme.danger },
                        ]}
                      >
                        {hostStatus === 'ok' ? 'connected' : 'no response'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Scope boundary — designed in deliberately */}
          <View style={styles.disclaimerRow}>
            <Ionicons name="information-circle-outline" size={15} color={theme.textFaint} />
            <Text style={styles.disclaimer}>
              Translation &amp; extraction only — this tool does not diagnose. Intended for clinician
              handoff.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ResultField({
  label,
  value,
  onSpeak,
}: {
  label: string;
  value: string;
  onSpeak?: () => void;
}) {
  const empty = !hasValue(value);
  return (
    <View style={styles.resultField}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {onSpeak && !empty && (
          <TouchableOpacity onPress={onSpeak} style={styles.speakButton} activeOpacity={0.7}>
            <Ionicons name="volume-high" size={18} color={theme.accent} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.fieldValue, empty && styles.fieldValueEmpty]}>
        {empty ? NOT_MENTIONED : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  safeArea: { flex: 1 },
  scrollContent: { padding: space.lg, paddingBottom: space.xxl + space.lg },
  header: { marginBottom: space.xl },
  title: { color: theme.text, fontSize: 26, fontWeight: '800', lineHeight: 31, letterSpacing: 0.2 },
  subtitle: { color: theme.textDim, fontSize: 14, marginTop: space.sm, lineHeight: 19 },
  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
    marginTop: space.lg,
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  guideLinkText: { color: theme.accent, fontSize: 14, fontWeight: '600' },

  micButton: {
    backgroundColor: theme.accent,
    borderRadius: radius.lg,
    paddingVertical: space.xl + space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginBottom: space.xl,
  },
  micButtonRecording: { backgroundColor: theme.danger },
  micLabel: { color: theme.bg, fontSize: 16, fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { color: theme.textDim, marginHorizontal: space.md, fontSize: 13 },

  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    minHeight: 96,
    fontSize: 16,
    color: theme.text,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: theme.accent,
    borderRadius: radius.md,
    paddingVertical: space.md + 2,
    alignItems: 'center',
  },
  primaryButtonText: { color: theme.bg, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.45 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: space.lg },
  loadingText: { marginLeft: space.sm, color: theme.textDim },

  connBanner: {
    backgroundColor: theme.dangerSoft,
    borderColor: theme.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.lg,
  },
  connBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  connBannerTitle: { color: theme.danger, fontWeight: '700', fontSize: 14 },
  connBannerText: { color: '#F3B7B3', fontSize: 13, lineHeight: 18 },

  resultsSection: { marginTop: space.xl },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
  },
  sectionTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  subsectionTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: space.lg,
    marginBottom: space.md,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actionRow: { flexDirection: 'row', gap: space.sm },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: radius.sm,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
  },
  actionButtonText: { color: theme.accent, fontSize: 14, fontWeight: '600' },

  resultField: {
    backgroundColor: theme.surface,
    borderLeftWidth: 3,
    borderLeftColor: theme.accent,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    marginBottom: space.md,
  },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  fieldLabel: {
    color: theme.textDim,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  speakButton: { padding: space.xs },
  fieldValue: { color: theme.text, fontSize: 15, lineHeight: 21 },
  fieldValueEmpty: { color: theme.textFaint, fontStyle: 'italic' },

  error: { color: theme.danger, fontSize: 14, paddingVertical: space.md },

  settingsBlock: { marginTop: space.xl, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: space.lg },
  settingsToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  settingsToggleText: { color: theme.textDim, fontSize: 13 },
  settingsBody: { marginTop: space.md },
  hostInput: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    fontSize: 14,
    color: theme.text,
  },
  settingsActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  smallPrimary: {
    backgroundColor: theme.accent,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  smallPrimaryText: { color: theme.bg, fontSize: 14, fontWeight: '700' },
  smallOutline: {
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  smallOutlineText: { color: theme.accent, fontSize: 14, fontWeight: '600' },
  hostStatusRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  hostStatusText: { fontSize: 13, fontWeight: '600' },

  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs + 2,
    marginTop: space.xl,
    paddingHorizontal: space.sm,
  },
  disclaimer: { flex: 1, color: theme.textFaint, fontSize: 12, lineHeight: 17 },
});
