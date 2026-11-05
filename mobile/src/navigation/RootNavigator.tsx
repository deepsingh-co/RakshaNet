import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { AlertsScreen } from '../screens/AlertsScreen';
import { AssistantScreen } from '../screens/AssistantScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { ContactFormScreen } from '../screens/ContactFormScreen';
import { CreateChildScreen } from '../screens/CreateChildScreen';
import { GuardiansScreen } from '../screens/GuardiansScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { IncidentDetailScreen } from '../screens/IncidentDetailScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { PeopleScreen } from '../screens/PeopleScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { VerifyContactScreen } from '../screens/VerifyContactScreen';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<
  keyof TabParamList,
  { active: React.ComponentProps<typeof Ionicons>['name']; inactive: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Alerts: { active: 'notifications', inactive: 'notifications-outline' },
  People: { active: 'people', inactive: 'people-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.greenDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive}
            size={size ?? 22}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="People" component={PeopleScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View style={styles.boot}>
        <View style={styles.bootLogo}>
          <Ionicons name="shield-checkmark" size={34} color={colors.white} />
        </View>
        <Text style={styles.bootTitle}>SURAKSHA AI</Text>
        <Text style={styles.bootCaption}>Restoring your safety session…</Text>
        <ActivityIndicator size="small" color={colors.green} style={styles.bootSpinner} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Tabs" component={MainTabs} options={{ animation: 'none' }} />
          <Stack.Screen name="Report" component={ReportScreen} />
          <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} />
          <Stack.Screen name="Contacts" component={ContactsScreen} />
          <Stack.Screen name="ContactForm" component={ContactFormScreen} />
          <Stack.Screen name="VerifyContact" component={VerifyContactScreen} />
          <Stack.Screen name="Guardians" component={GuardiansScreen} />
          <Stack.Screen name="CreateChild" component={CreateChildScreen} />
          <Stack.Screen name="Assistant" component={AssistantScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'none' }} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 68,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabItem: { paddingVertical: 2 },
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  bootLogo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  bootTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.ink,
  },
  bootCaption: { fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  bootSpinner: { marginTop: spacing.lg },
});
