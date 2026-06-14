import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
  Ellipse,
  G,
} from 'react-native-svg';
import { theme } from '@/theme';

/**
 * Abstract, modern cloud mark. Built from overlapping smooth forms (not bumpy
 * cartoon humps) with a cyan gradient, a soft radial glow behind, and a few
 * small "altitude" dots. Purely decorative.
 */
export function CloudMark({ size = 200 }: { size?: number }) {
  const w = size;
  const h = size * 0.7;
  return (
    <Svg width={w} height={h} viewBox="0 0 160 112">
      <Defs>
        <LinearGradient id="cloudFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7DD3FC" />
          <Stop offset="1" stopColor={theme.accent} />
        </LinearGradient>
        <RadialGradient id="glow" cx="50%" cy="55%" r="55%">
          <Stop offset="0" stopColor={theme.accent} stopOpacity="0.35" />
          <Stop offset="1" stopColor={theme.accent} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* soft glow */}
      <Circle cx="80" cy="64" r="62" fill="url(#glow)" />

      {/* depth layer — a second cloud set back, dimmer and offset */}
      <G opacity={0.4}>
        <Ellipse cx="86" cy="74" rx="54" ry="19" fill={theme.accent} />
        <Circle cx="58" cy="62" r="20" fill={theme.accent} />
        <Circle cx="94" cy="50" r="26" fill={theme.accent} />
        <Circle cx="120" cy="64" r="18" fill={theme.accent} />
      </G>

      {/* foreground cloud — overlapping circles + base ellipse merge into a smooth silhouette */}
      <G>
        <Ellipse cx="78" cy="70" rx="56" ry="20" fill="url(#cloudFill)" />
        <Circle cx="48" cy="58" r="22" fill="url(#cloudFill)" />
        <Circle cx="84" cy="44" r="30" fill="url(#cloudFill)" />
        <Circle cx="116" cy="60" r="20" fill="url(#cloudFill)" />
      </G>

      {/* abstract "altitude" dots */}
      <Circle cx="138" cy="26" r="3.5" fill={theme.accent} opacity={0.9} />
      <Circle cx="150" cy="40" r="2.2" fill={theme.accent} opacity={0.6} />
      <Circle cx="20" cy="34" r="2.6" fill={theme.accent} opacity={0.7} />
    </Svg>
  );
}
