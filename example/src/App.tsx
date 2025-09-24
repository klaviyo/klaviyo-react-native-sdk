import { useEffect } from 'react';

import { Button, View } from 'react-native';
import { type AppViewInterface, appViews } from './AppViewInterface';
import { styles } from './Styles';
import { Linking } from 'react-native';
import { Klaviyo } from 'klaviyo-react-native-sdk';

export default function App() {
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (Klaviyo.handleUniversalTrackingLink(url)) {
        // Klaviyo is handling a universal click tracking link
        console.log('Event Listener: Klaviyo tracking link', url);
        return;
      }

      // Handle a deep links into the app
      console.log('Navigate to url', url);
    };

    // Get initial URL, if app opened with a link
    Linking.getInitialURL().then((url) => {
      console.log('Initial Url: url', url);
      handleUrl(url);
    });

    // Listen for deep link events now that the app is running
    Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });
  }, []);

  return (
    <View style={styles.container}>
      <>
        {appViews.map((appView: AppViewInterface) => (
          <Button
            key={appView.title}
            title={appView.title}
            color={appView.color}
            onPress={appView.onPress}
          />
        ))}
      </>
    </View>
  );
}
