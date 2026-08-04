import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DefaultTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/utils/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (session && inAuthGroup) {
      router.replace('/');
    } else if (!session && !inAuthGroup) {
      router.replace('/auth/login');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#d4a574" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="app" />
      </Stack>
    </ThemeProvider>
  );
}
