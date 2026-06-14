// Night-cockpit palette — a single source of truth so every screen stays
// consistent and high-contrast regardless of the device's light/dark setting.
export const theme = {
  bg: '#0B1220', // deep night navy (app background)
  surface: '#131D33', // raised cards / inputs
  surfaceAlt: '#1B2742', // pressed / secondary surface
  border: '#26334D', // hairlines, input borders
  text: '#F2F6FF', // primary text (near-white)
  textDim: '#9FB0CC', // secondary text / captions
  textFaint: '#64748B', // disabled / placeholder
  accent: '#38BDF8', // cyan — primary actions
  accentInk: '#04263B', // dark ink that reads on cyan buttons
  accentSoft: '#0E2A3D', // translucent cyan fill for chips/outlines
  danger: '#FF5A52', // urgent / recording
  dangerInk: '#2A1416', // dark ink on danger fills
  dangerSoft: '#241016', // danger banner background
  success: '#34D399', // connected / confirmed
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
