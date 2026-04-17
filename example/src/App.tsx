// React / React Native
import { useEffect } from 'react';
import { SectionList, SafeAreaView, Linking } from 'react-native';

// Klaviyo SDK
import { Klaviyo } from 'klaviyo-react-native-sdk';

// Local components / styles
import { styles } from './Styles';
import { SectionHeader } from './components/SectionHeader';

// Section components — each section owns the hook(s) it consumes, so state
// changes in one section don't re-render sibling sections. No React.memo or
// memoization gymnastics needed: App holds no hook-derived state, so its
// children aren't re-rendered by unrelated hook updates.
import { AnalyticsSection } from './sections/AnalyticsSection';
import { FormsSection } from './sections/FormsSection';
import { GeofencingSection } from './sections/GeofencingSection';
import { PushSection } from './sections/PushSection';

// Environment — copy example/.env.template to example/.env and fill in your key.
// Run `yarn install` in example/ after adding react-native-dotenv, then restart Metro.
import { KLAVIYO_API_KEY } from '@env';

// react-native-dotenv inlines env vars at build time. Fail fast if the key is
// missing or still set to the placeholder — the example app is useless without
// one, and a clear module-load error beats silently broken SDK calls.
const PLACEHOLDER_API_KEY = 'YOUR_KLAVIYO_PUBLIC_API_KEY';
const API_KEY = KLAVIYO_API_KEY ?? '';
if (API_KEY.length === 0 || API_KEY === PLACEHOLDER_API_KEY) {
  throw new Error(
    'Klaviyo API key not configured. Copy example/.env.template to example/.env and set KLAVIYO_API_KEY to your public API key. If you have already done this, restart Metro with `yarn start --reset-cache` to pick up the new .env contents.'
  );
}

// Initialize synchronously at module load so native SDK calls from hook
// useEffects (which fire before App's useEffect) land after the bridge has
// been told about the public key.
Klaviyo.initialize(API_KEY);

type SectionKey = 'analytics' | 'forms' | 'geofencing' | 'push';

// SectionList data — each section corresponds to a feature domain. Each
// section has a single item (the section key) whose content is rendered by
// renderItem; the section title is surfaced via renderSectionHeader.
// Defined at module scope so the reference is stable across renders.
const SECTIONS: { title: string; data: SectionKey[] }[] = [
  { title: 'Profile & Events', data: ['analytics'] },
  { title: 'In-App Forms', data: ['forms'] },
  { title: 'Geofencing & Location', data: ['geofencing'] },
  { title: 'Push Notifications', data: ['push'] },
];

const renderSection = (sectionKey: SectionKey) => {
  switch (sectionKey) {
    case 'analytics':
      return <AnalyticsSection />;
    case 'forms':
      return <FormsSection />;
    case 'geofencing':
      return <GeofencingSection />;
    case 'push':
      return <PushSection />;
    default:
      return null;
  }
};

export default function App() {
  useEffect(() => {
    // Deep linking handler
    const handleUrl = (url: string) => {
      if (Klaviyo.handleUniversalTrackingLink(url)) {
        // Klaviyo is handling a universal click tracking link
        console.log('[App] Klaviyo tracking link:', url);
        return;
      }

      // If false, Klaviyo didn't handle this URL — route normally
      // e.g., navigate using React Navigation: navigation.navigate(parseUrl(url))
      console.log('Navigate to url', url);
    };

    // Handle cold-start deep links (app opened via URL)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    // Listen for deep link events while the app is running; return cleanup to prevent listener leak
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        sections={SECTIONS}
        keyExtractor={(item) => item}
        renderItem={({ item }) => renderSection(item)}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} />
        )}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}
