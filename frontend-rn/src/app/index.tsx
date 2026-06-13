import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as Speech from 'expo-speech';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const API_URL = 'http://192.168.1.120:8000/translate';

interface TranslationResponse {
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
  error?: string;
}

export default function TranslatorScreen() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<TranslationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post<TranslationResponse>(API_URL, { message });
      setResult(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to translate. Make sure backend is running on localhost:8000');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async (text: string) => {
    try {
      await Speech.speak(text, { language: 'en' });
    } catch (error) {
      console.error('TTS Error:', error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              In-Flight Medical Translator
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Translate and extract medical information in any language
            </ThemedText>
          </View>

          {/* Input Section */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Patient Message
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter message in any language..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleTranslate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Translate & Extract</ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {/* Results Section */}
          {result && (
            <View style={styles.section}>
              {result.success ? (
                <>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Results
                  </ThemedText>

                  {/* Language Detection */}
                  <ResultField
                    label="Detected Language"
                    value={result.sample.detected_language}
                  />

                  {/* Translation */}
                  <ResultField
                    label="English Translation"
                    value={result.sample.raw_translation}
                    onSpeak={() => handleSpeak(result.sample.raw_translation)}
                  />

                  {/* SAMPLE Fields */}
                  <ThemedText type="subtitle" style={styles.subsectionTitle}>
                    SAMPLE Clinical Summary
                  </ThemedText>

                  <ResultField label="Symptoms" value={result.sample.symptoms} />
                  <ResultField label="Allergies" value={result.sample.allergies} />
                  <ResultField label="Medications" value={result.sample.medications} />
                  <ResultField label="Past Medical History" value={result.sample.past_medical_history} />
                  <ResultField label="Last Oral Intake" value={result.sample.last_oral_intake} />
                  <ResultField label="Events" value={result.sample.events} />
                </>
              ) : (
                <ThemedText style={styles.error}>
                  Error: {result.error}
                </ThemedText>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ResultField({ label, value, onSpeak }: { label: string; value: string; onSpeak?: () => void }) {
  return (
    <View style={styles.resultField}>
      <View style={styles.fieldHeader}>
        <ThemedText type="default" style={styles.fieldLabel}>
          {label}
        </ThemedText>
        {onSpeak && (
          <TouchableOpacity onPress={onSpeak} style={styles.speakButton}>
            <ThemedText style={styles.speakButtonText}>🔊</ThemedText>
          </TouchableOpacity>
        )}
      </View>
      <ThemedText style={styles.fieldValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 100,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultField: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  speakButton: {
    padding: 8,
  },
  speakButtonText: {
    fontSize: 18,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    paddingVertical: 12,
  },
});
