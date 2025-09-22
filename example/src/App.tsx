import { useEffect } from 'react';

import { Button, View } from 'react-native';
import { type AppViewInterface, appViews } from './AppViewInterface';
import { styles } from './Styles';
import { Linking } from 'react-native';
import { Klaviyo } from 'klaviyo-react-native-sdk';

export default function App() {
  useEffect(() => {
    // Get initial URL, if app opened with a link
    Linking.getInitialURL().then((url) => {
      if (Klaviyo.handleUniversalTrackingLink(url)) {
        console.log('Initial Url: Klaviyo tracking link', url);
      } else {
        console.log('Initial Url: url', url);
      }
    });
    // Listen for deep link events now that the app is running
    Linking.addEventListener('url', ({ url }) => {
      if (Klaviyo.handleUniversalTrackingLink(url)) {
        console.log('Event Listener: Klaviyo tracking link', url);
      } else {
        console.log('Event Listener: url', url);
      }
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
