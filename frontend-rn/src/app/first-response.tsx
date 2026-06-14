import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/**
 * First Response — STATIC, general reference only.
 *
 * Design rule (deliberate, regulatory): this screen only *reproduces* established,
 * general first-aid / crew-protocol guidance. It must NEVER read the patient's
 * SAMPLE data or make any patient-specific judgment — doing so would cross into
 * triage/diagnosis and make the app a regulated medical device. Keep it static.
 */

const UNIVERSAL_STEPS: { text: string; note?: string }[] = [
  {
    text: 'Contact ground-based medical support immediately.',
    note: 'They direct care (e.g. MedLink / STAT-MD). This is the established protocol for any in-flight medical event.',
  },
  { text: 'Note the time symptoms started, and tell ground medical support.' },
  {
    text: 'Ask if a medical professional is on board.',
    note: 'A clinician is available on roughly half of in-flight emergencies.',
  },
  {
    text: 'Unresponsive and not breathing normally → start CPR and use the onboard AED.',
    note: 'Follow the AED voice prompts.',
  },
  { text: 'Unconscious but breathing → place in the recovery position; keep the airway clear.' },
  { text: 'Decreased or altered consciousness → do not give food or drink.' },
  {
    text: 'Locate the Emergency Medical Kit (EMK) and AED.',
    note: 'Do not administer kit medications except under a clinician’s direction.',
  },
];

const RED_FLAGS: string[] = [
  'Chest pain or pressure',
  'Difficulty breathing',
  'Sudden weakness, numbness, face drooping, or trouble speaking',
  'Severe or uncontrolled bleeding',
  'Unresponsiveness or fainting',
  'Seizure',
  'Severe allergic reaction (swelling, widespread rash, trouble breathing)',
];

export default function FirstResponseScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Always-on, highest-value action */}
          <View style={styles.primaryCard}>
            <ThemedText style={styles.primaryCardTitle}>Contact ground medical support first</ThemedText>
            <ThemedText style={styles.primaryCardText}>
              For any medical event, contact your ground-based medical support service. They direct
              care — this tool only helps you communicate and document.
            </ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Universal first-response steps
          </ThemedText>
          {UNIVERSAL_STEPS.map((step, i) => (
            <View key={i} style={styles.step}>
              <ThemedText style={styles.stepBullet}>{i + 1}</ThemedText>
              <View style={styles.stepBody}>
                <ThemedText style={styles.stepText}>{step.text}</ThemedText>
                {step.note ? <ThemedText style={styles.stepNote}>{step.note}</ThemedText> : null}
              </View>
            </View>
          ))}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Signs that warrant immediate ground-medical contact
          </ThemedText>
          <ThemedText style={styles.redFlagIntro}>
            General reference — not a checklist applied to your passenger. If any are present, contact
            ground medical support right away.
          </ThemedText>
          {RED_FLAGS.map((flag, i) => (
            <View key={i} style={styles.redFlagRow}>
              <ThemedText style={styles.redFlagDot}>•</ThemedText>
              <ThemedText style={styles.redFlagText}>{flag}</ThemedText>
            </View>
          ))}

          <ThemedText style={styles.disclaimer}>
            ⚕️ General first-aid and crew-protocol reference only — not medical advice and not
            specific to any passenger. Follow ground-medical direction and your airline’s protocol.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  primaryCard: {
    backgroundColor: '#FFF3F2',
    borderColor: '#FF3B30',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  primaryCardTitle: { color: '#C0271D', fontWeight: '700', fontSize: 17, marginBottom: 6 },
  primaryCardText: { color: '#C0271D', fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  step: { flexDirection: 'row', marginBottom: 14 },
  stepBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    overflow: 'hidden',
  },
  stepBody: { flex: 1 },
  stepText: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  stepNote: { fontSize: 13, lineHeight: 18, opacity: 0.6, marginTop: 3 },
  redFlagIntro: { fontSize: 13, opacity: 0.6, lineHeight: 18, marginBottom: 12 },
  redFlagRow: { flexDirection: 'row', marginBottom: 8 },
  redFlagDot: { color: '#FF3B30', fontSize: 15, marginRight: 10, lineHeight: 21 },
  redFlagText: { fontSize: 15, lineHeight: 21, flex: 1 },
  disclaimer: {
    fontSize: 12,
    opacity: 0.5,
    lineHeight: 17,
    marginTop: 24,
    textAlign: 'center',
  },
});
