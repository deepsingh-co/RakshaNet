import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { OutboxProvider } from './src/context/OutboxContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.green,
    background: colors.background,
    card: colors.surface,
    text: colors.ink,
    border: colors.border,
    notification: colors.red,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OutboxProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </OutboxProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
