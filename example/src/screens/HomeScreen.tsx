// React / React Native
import { useEffect, useState } from 'react';
import { SectionList, SafeAreaView, Linking } from 'react-native';

// Klaviyo SDK
import { Klaviyo } from 'klaviyo-react-native-sdk';

// Local components / styles
import { styles } from '../Styles';
import { SectionHeader } from '../components/SectionHeader';
import { AppHeader } from '../components/AppHeader';
import { CompanyIdModal } from '../components/CompanyIdModal';
import { useCompanyId } from '../hooks/useCompanyId';

// Section components — each section owns the hook(s) it consumes, so state
// changes in one section don't re-render sibling sections. No React.memo or
// memoization gymnastics needed: HomeScreen holds no hook-derived state
// besides company-id/settings-modal visibility, so its children aren't
// re-rendered by unrelated hook updates.
import { AnalyticsSection } from '../sections/AnalyticsSection';
import { FormsSection } from '../sections/FormsSection';
import { GeofencingSection } from '../sections/GeofencingSection';
import { PushSection } from '../sections/PushSection';
import { AuthSection } from '../sections/AuthSection';

type SectionKey = 'analytics' | 'forms' | 'geofencing' | 'push' | 'auth';

// SectionList data — each section corresponds to a feature domain. Each
// section has a single item (the section key) whose content is rendered by
// renderItem; the section title is surfaced via renderSectionHeader.
// Defined at module scope so the reference is stable across renders.
const SECTIONS: { title: string; data: SectionKey[] }[] = [
  { title: 'Profile & Events', data: ['analytics'] },
  { title: 'In-App Forms', data: ['forms'] },
  { title: 'Geofencing & Location', data: ['geofencing'] },
  { title: 'Push Notifications', data: ['push'] },
  { title: 'Auth', data: ['auth'] },
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
    case 'auth':
      return <AuthSection />;
    default:
      return null;
  }
};

/**
 * The example app's main screen — a `SectionList` of feature domains. This
 * was `App.tsx`'s entire body prior to MAGE-879; it moved here (unchanged
 * aside from the new Auth section) when the app grew a navigation stack, so
 * `App.tsx` could become the `NavigationContainer` + native-stack shell.
 */
export function HomeScreen() {
  const { companyId, isOverridden, changeCompanyId, resetToDefault } =
    useCompanyId();
  const [settingsVisible, setSettingsVisible] = useState(false);

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
      <AppHeader onSettingsPress={() => setSettingsVisible(true)} />
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
      <CompanyIdModal
        visible={settingsVisible}
        currentCompanyId={companyId}
        isOverridden={isOverridden}
        onSave={(key) => {
          changeCompanyId(key);
          setSettingsVisible(false);
        }}
        onReset={() => {
          resetToDefault();
          setSettingsVisible(false);
        }}
        onClose={() => setSettingsVisible(false)}
      />
    </SafeAreaView>
  );
}
