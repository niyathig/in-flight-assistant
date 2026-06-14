import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloudMark } from '@/components/cloud-mark';
import { theme, space } from '@/theme';

const HOLD_MS = 2200; // total time on splash before auto-advancing

export default function SplashScreen() {
  const router = useRouter();
  const cloudOpacity = useRef(new Animated.Value(0)).current;
  const cloudRise = useRef(new Animated.Value(16)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const advanced = useRef(false);

  const go = () => {
    if (advanced.current) return;
    advanced.current = true;
    router.replace('/translator');
  };

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(cloudOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cloudRise, {
          toValue: 0,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(go, HOLD_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable style={styles.container} onPress={go} accessibilityRole="button">
      <View style={styles.center}>
        <Animated.View
          style={{ opacity: cloudOpacity, transform: [{ translateY: cloudRise }] }}
        >
          <CloudMark size={220} />
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
          <Text style={styles.title}>In-Flight</Text>
          <Text style={styles.title}>Medical Translator</Text>
          <Text style={styles.tagline}>Any language → English clinical handoff</Text>
        </Animated.View>
      </View>

      <Animated.Text style={[styles.tapHint, { opacity: textOpacity }]}>
        Tap to continue
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  textBlock: { alignItems: 'center', marginTop: space.xl },
  title: {
    color: theme.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 36,
    textAlign: 'center',
  },
  tagline: {
    color: theme.textDim,
    fontSize: 15,
    marginTop: space.md,
    textAlign: 'center',
  },
  tapHint: {
    color: theme.textFaint,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: space.xxl,
  },
});
