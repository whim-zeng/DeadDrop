import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/stores/authStore';
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { AnonymousIdentityScreen } from '@/screens/onboarding/AnonymousIdentityScreen';
import { LocationPermissionScreen } from '@/screens/onboarding/LocationPermissionScreen';
import { AppNavigator } from './AppNavigator';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const profile = useAuthStore((s) => s.profile);
  const onboardingStep = useAuthStore((s) => s.onboardingStep);

  // If already onboarded, go straight to app
  if (isOnboarded && profile) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="App" component={AppNavigator} />
      </Stack.Navigator>
    );
  }

  // Determine initial onboarding screen based on persisted progress
  const initialRoute =
    onboardingStep >= 2
      ? 'LocationPermission'
      : onboardingStep >= 1
        ? 'AnonymousIdentity'
        : 'Welcome';

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="AnonymousIdentity" component={AnonymousIdentityScreen} />
      <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
      <Stack.Screen name="App" component={AppNavigator} />
    </Stack.Navigator>
  );
}
