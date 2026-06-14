import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="first-response"
        options={{ headerShown: true, title: 'First Response' }}
      />
    </Stack>
  );
}
