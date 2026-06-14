import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme, radius, space } from '@/theme';

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
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Always-on, highest-value action */}
          <View style={styles.primaryCard}>
            <View style={styles.primaryCardHeader}>
              <Ionicons name="call" size={20} color={theme.danger} />
              <Text style={styles.primaryCardTitle}>Contact ground medical support first</Text>
            </View>
            <Text style={styles.primaryCardText}>
              For any medical event, contact your ground-based medical support service. They direct
              care — this tool only helps you communicate and document.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Universal first-response steps</Text>
          {UNIVERSAL_STEPS.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{i + 1}</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepText}>{step.text}</Text>
                {step.note ? <Text style={styles.stepNote}>{step.note}</Text> : null}
              </View>
            </View>
          ))}

          <View style={styles.redFlagHeaderRow}>
            <Ionicons name="warning-outline" size={18} color={theme.danger} />
            <Text style={styles.sectionTitle}>Signs that warrant immediate contact</Text>
          </View>
          <Text style={styles.redFlagIntro}>
            General reference — not a checklist applied to your passenger. If any are present, contact
            ground medical support right away.
          </Text>
          {RED_FLAGS.map((flag, i) => (
            <View key={i} style={styles.redFlagRow}>
              <View style={styles.redFlagDot} />
              <Text style={styles.redFlagText}>{flag}</Text>
            </View>
          ))}

          <View style={styles.disclaimerRow}>
            <Ionicons name="information-circle-outline" size={15} color={theme.textFaint} />
            <Text style={styles.disclaimer}>
              General first-aid and crew-protocol reference only — not medical advice and not specific
              to any passenger. Follow ground-medical direction and your airline’s protocol.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  safeArea: { flex: 1 },
  scrollContent: { padding: space.lg, paddingBottom: space.xxl + space.lg },

  primaryCard: {
    backgroundColor: theme.dangerSoft,
    borderColor: theme.danger,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.xl,
  },
  primaryCardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  primaryCardTitle: { color: theme.danger, fontWeight: '800', fontSize: 16, flex: 1 },
  primaryCardText: { color: '#F3B7B3', fontSize: 14, lineHeight: 20 },

  sectionTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: space.md },

  step: { flexDirection: 'row', marginBottom: space.lg },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  stepBadgeText: { color: theme.bg, fontWeight: '800', fontSize: 13 },
  stepBody: { flex: 1 },
  stepText: { color: theme.text, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  stepNote: { color: theme.textDim, fontSize: 13, lineHeight: 18, marginTop: space.xs },

  redFlagHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, marginBottom: space.md },
  redFlagIntro: { color: theme.textDim, fontSize: 13, lineHeight: 18, marginBottom: space.md },
  redFlagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm + 2 },
  redFlagDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.danger,
    marginRight: space.md,
  },
  redFlagText: { color: theme.text, fontSize: 15, lineHeight: 21, flex: 1 },

  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs + 2,
    marginTop: space.xxl,
    paddingHorizontal: space.sm,
  },
  disclaimer: { flex: 1, color: theme.textFaint, fontSize: 12, lineHeight: 17 },
});
