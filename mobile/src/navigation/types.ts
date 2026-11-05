import type { NavigatorScreenParams } from '@react-navigation/native';
import type { IncidentType } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  Home: undefined;
  Alerts: undefined;
  People: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Report: { type?: IncidentType } | undefined;
  IncidentDetail: { clientIncidentId?: string; incidentId?: string };
  Contacts: undefined;
  ContactForm: undefined;
  VerifyContact: { contactId: string; contactName: string; devCode?: string };
  Guardians: undefined;
  CreateChild: undefined;
};

export type RootStackScreen<T extends keyof RootStackParamList> = {
  route: { params: RootStackParamList[T] };
  navigation: {
    goBack: () => void;
    navigate: <N extends keyof RootStackParamList>(
      name: N,
      params?: RootStackParamList[N],
    ) => void;
  };
};
