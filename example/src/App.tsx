// React / React Native
import { useEffect, useMemo } from 'react';
import { SectionList, SafeAreaView, Linking } from 'react-native';

// Klaviyo SDK
import { Klaviyo } from 'klaviyo-react-native-sdk';

// Local hooks
import { useAnalytics } from './hooks/useAnalytics';
import { useForms } from './hooks/useForms';
import { useLocation } from './hooks/useLocation';
import { usePush } from './hooks/usePush';

// Local components / styles
import { styles } from './Styles';
import { SectionHeader } from './components/SectionHeader';

// Section components — extracted so a keystroke in one section's field doesn't
// re-render every other section. Each is wrapped in React.memo and only takes
// the hook result(s) it needs as props.
import { EventsSection } from './sections/EventsSection';
import { FormsSection } from './sections/FormsSection';
import { GeofencingSection } from './sections/GeofencingSection';
import { ProfileSection } from './sections/ProfileSection';
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
    'Klaviyo API key not configured. Copy example/.env.template to example/.env and set KLAVIYO_API_KEY to your public API key.'
  );
}

// Initialize synchronously at module load so native SDK calls from hook
// useEffects (which fire before App's useEffect) land after the bridge has
// been told about the public key.
Klaviyo.initialize(API_KEY);

type SectionKey = 'profile' | 'events' | 'forms' | 'geofencing' | 'push';

export default function App() {
  const analytics = useAnalytics();
  const forms = useForms();
  const location = useLocation();
  const push = usePush();

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

  // SectionList data — each section corresponds to a feature domain. Each
  // section has a single item (the section key) whose content is rendered by
  // renderItem; the section title is surfaced via renderSectionHeader.
  const sections = useMemo(
    () =>
      [
        { title: 'Profile', data: ['profile'] },
        { title: 'Events', data: ['events'] },
        { title: 'In-App Forms', data: ['forms'] },
        { title: 'Geofencing & Location', data: ['geofencing'] },
        { title: 'Push Notifications', data: ['push'] },
      ] satisfies { title: string; data: SectionKey[] }[],
    []
  );

  const renderSection = (sectionKey: SectionKey) => {
    switch (sectionKey) {
      case 'profile':
        return <ProfileSection analytics={analytics} />;
      case 'events':
        return <EventsSection analytics={analytics} />;
      case 'forms':
        return <FormsSection forms={forms} />;
      case 'geofencing':
        return <GeofencingSection location={location} />;
      case 'push':
        return <PushSection push={push} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        sections={sections}
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
