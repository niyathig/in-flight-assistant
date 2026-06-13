import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              In-Flight Medical Translator
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Speak or type in any language — it auto-detects.
            </ThemedText>
          </View>

          {/* Voice input */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
              onPress={handleMicPress}
              disabled={loading}
            >
              <ThemedText style={styles.micIcon}>{isRecording ? '⏹' : '🎤'}</ThemedText>
              <ThemedText style={styles.micLabel}>
                {isRecording ? 'Recording… tap to stop' : 'Tap to speak'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>or type</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {/* Text input */}
          <View style={styles.section}>
            <TextInput
              style={styles.input}
              placeholder="Enter message in any language..."
              placeholderTextColor="#999"
              multiline
              value={message}
              onChangeText={setMessage}
              editable={!loading && !isRecording}
            />
            <TouchableOpacity
              style={[styles.button, (loading || isRecording) && styles.buttonDisabled]}
              onPress={handleTranslate}
              disabled={loading || isRecording}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Translate & Extract</ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <ThemedText style={styles.loadingText}>{loadingStage || 'Processing…'}</ThemedText>
            </View>
          )}

          {/* Backend unreachable — the most common live-demo failure */}
          {connError && (
            <View style={styles.connBanner}>
              <ThemedText style={styles.connBannerTitle}>Can't reach the backend</ThemedText>
              <ThemedText style={styles.connBannerText}>
                Tried {apiHost}. Make sure the FastAPI server is running and the device is on the
                same network — or change the address under ⚙︎ Backend below.
              </ThemedText>
            </View>
          )}

          {/* Results */}
          {result && result.success && (
            <View style={styles.section}>
              <View style={styles.resultsHeader}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Results
                </ThemedText>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                    <ThemedText style={styles.actionButtonText}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                    <ThemedText style={styles.actionButtonText}>Share</ThemedText>
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

              <ThemedText type="subtitle" style={styles.subsectionTitle}>
                SAMPLE Clinical Summary
              </ThemedText>
              <ResultField label="Symptoms" value={result.sample.symptoms} />
              <ResultField label="Allergies" value={result.sample.allergies} />
              <ResultField label="Medications" value={result.sample.medications} />
              <ResultField label="Past Medical History" value={result.sample.past_medical_history} />
              <ResultField label="Last Oral Intake" value={result.sample.last_oral_intake} />
              <ResultField label="Events" value={result.sample.events} />
            </View>
          )}

          {result && !result.success && (
            <ThemedText style={styles.error}>Error: {result.error}</ThemedText>
          )}

          {/* Backend host — editable at runtime so a stale IP never breaks a demo */}
          <View style={styles.settingsBlock}>
            <TouchableOpacity
              style={styles.settingsToggle}
              onPress={() => setShowSettings((v) => !v)}
            >
              <ThemedText style={styles.settingsToggleText}>
                ⚙︎ Backend: {apiHost.replace(/^https?:\/\//, '')}
              </ThemedText>
              <ThemedText style={styles.settingsChevron}>{showSettings ? '▲' : '▼'}</ThemedText>
            </TouchableOpacity>
            {showSettings && (
              <View style={styles.settingsBody}>
                <TextInput
                  style={styles.hostInput}
                  value={hostDraft}
                  onChangeText={setHostDraft}
                  placeholder="http://192.168.1.120:8000"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!loading}
                />
                <View style={styles.settingsActions}>
                  <TouchableOpacity style={styles.settingsButton} onPress={saveHost} disabled={loading}>
                    <ThemedText style={styles.settingsButtonText}>Save</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.settingsButtonOutline}
                    onPress={() => testHost()}
                    disabled={loading}
                  >
                    <ThemedText style={styles.settingsButtonOutlineText}>Test</ThemedText>
                  </TouchableOpacity>
                  <ThemedText
                    style={[
                      styles.hostStatusText,
                      hostStatus === 'ok' && styles.hostStatusOk,
                      hostStatus === 'fail' && styles.hostStatusFail,
                    ]}
                  >
                    {hostStatus === 'ok' ? '✓ connected' : hostStatus === 'fail' ? '✗ no response' : ''}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>

          {/* Scope boundary — designed in deliberately */}
          <ThemedText style={styles.disclaimer}>
            ⚕️ Translation & extraction only — this tool does not diagnose. Intended for clinician
            handoff.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
        <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
        {onSpeak && !empty && (
          <TouchableOpacity onPress={onSpeak} style={styles.speakButton}>
            <ThemedText style={styles.speakButtonText}>🔊</ThemedText>
          </TouchableOpacity>
        )}
      </View>
      <ThemedText style={[styles.fieldValue, empty && styles.fieldValueEmpty]}>
        {empty ? NOT_MENTIONED : value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 6, lineHeight: 30 },
  subtitle: { fontSize: 14, opacity: 0.7 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  subsectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 12 },
  micButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonRecording: { backgroundColor: '#FF3B30' },
  micIcon: { fontSize: 40, marginBottom: 8 },
  micLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#ccc', opacity: 0.4 },
  dividerText: { marginHorizontal: 12, fontSize: 13, opacity: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 90,
    fontSize: 16,
    color: '#333',
  },
  button: { backgroundColor: '#007AFF', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  loadingText: { marginLeft: 8, opacity: 0.7 },
  connBanner: {
    backgroundColor: '#FFF3F2',
    borderColor: '#FF3B30',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  connBannerTitle: { color: '#C0271D', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  connBannerText: { color: '#C0271D', fontSize: 13, lineHeight: 18 },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionRow: { flexDirection: 'row', marginBottom: 12 },
  actionButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 8,
  },
  actionButtonText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  resultField: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 12,
    marginBottom: 12,
    paddingVertical: 6,
  },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fieldLabel: { fontWeight: '600', fontSize: 14 },
  speakButton: { padding: 6 },
  speakButtonText: { fontSize: 18 },
  fieldValue: { fontSize: 14, lineHeight: 20, opacity: 0.9 },
  fieldValueEmpty: { fontStyle: 'italic', opacity: 0.45 },
  error: { color: '#FF3B30', fontSize: 14, paddingVertical: 12 },
  disclaimer: {
    fontSize: 12,
    opacity: 0.5,
    lineHeight: 17,
    marginTop: 12,
    textAlign: 'center',
  },
  settingsBlock: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 12 },
  settingsToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsToggleText: { fontSize: 13, opacity: 0.7 },
  settingsChevron: { fontSize: 11, opacity: 0.5 },
  settingsBody: { marginTop: 10 },
  hostInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#333',
  },
  settingsActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  settingsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  settingsButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  settingsButtonOutline: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  settingsButtonOutlineText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  hostStatusText: { fontSize: 13, marginLeft: 12, opacity: 0.7 },
  hostStatusOk: { color: '#2E7D32', opacity: 1 },
  hostStatusFail: { color: '#C0271D', opacity: 1 },
});
