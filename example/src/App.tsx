// Navigation
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Klaviyo SDK
import { Klaviyo } from 'klaviyo-react-native-sdk';

// Local screens / navigation types
import { HomeScreen } from './screens/HomeScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ConfigureResponseScreen } from './screens/ConfigureResponseScreen';
import type { RootStackParamList } from './navigation/types';

// RN Installation Step: Source your public API key.
// This example uses `react-native-dotenv` to inline `KLAVIYO_API_KEY` from
// example/.env at build time; see example/babel.config.js for the plugin setup.
// Integrators are free to source the key any way they like.
import { KLAVIYO_API_KEY } from '@env';

// Fail fast if the key is missing or still set to the placeholder — the
// example app is useless without one, and a clear module-load error beats
// silently broken SDK calls.
const PLACEHOLDER_API_KEY = 'YOUR_KLAVIYO_PUBLIC_API_KEY';
const API_KEY = KLAVIYO_API_KEY ?? '';
if (API_KEY.length === 0 || API_KEY === PLACEHOLDER_API_KEY) {
  throw new Error(
    'Klaviyo API key not configured. Copy example/.env.template to example/.env and set KLAVIYO_API_KEY to your public API key. If you have already done this, restart Metro with `yarn start --reset-cache` to pick up the new .env contents.'
  );
}

// RN Installation Step: Initialize the Klaviyo SDK.
// If you'd rather initialize from native code, see the
// commented references in the iOS AppDelegate and Android MainApplication
Klaviyo.initialize(API_KEY);

const Stack = createNativeStackNavigator<RootStackParamList>();

// The app is a single `SectionList` screen (`Home`) plus, since MAGE-879, a
// push/navigation stack for the Auth feature's two secondary screens. `Home`
// renders its own header (`AppHeader`) so the native stack header is hidden
// for it; `AuthScreen`/`ConfigureResponse` use the native stack's header for
// back navigation and (on ConfigureResponse) a "Done" button.
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AuthScreen"
          component={AuthScreen}
          options={{ title: 'Auth' }}
        />
        <Stack.Screen
          name="ConfigureResponse"
          component={ConfigureResponseScreen}
          options={{ title: 'Configure Response' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
