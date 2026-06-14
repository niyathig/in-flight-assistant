import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '@/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="translator" />
        <Stack.Screen
          name="first-response"
          options={{
            headerShown: true,
            title: 'First Response',
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}
