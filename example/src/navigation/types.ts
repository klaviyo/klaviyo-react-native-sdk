/**
 * Root navigation param list for the example app's native stack
 * (introduced for MAGE-879's Auth screens — see `App.tsx`).
 */
export type RootStackParamList = {
  Home: undefined;
  AuthScreen: undefined;
  ConfigureResponse: { responseId: string };
};
