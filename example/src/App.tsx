import { useEffect } from 'react';

import { Button, View } from 'react-native';
import { type AppViewInterface, appViews } from './AppViewInterface';
import { styles } from './Styles';
import { Linking } from 'react-native';
import { Klaviyo } from 'klaviyo-react-native-sdk';

export default function App() {
  useEffect(() => {
    Linking.addEventListener('url', ({ url }) => {
      console.log('Event Listener: url', url);
      Klaviyo.handleUniversalTrackingLink(url);
    });
    Linking.getInitialURL().then((url) => {
      console.log('Initial Url: url', url);
      if (url != null) {
        Klaviyo.handleUniversalTrackingLink(url);
      }
    });
    Klaviyo.registerDeepLinkHandler((url) => {
      console.log('Klaviyo deep link: url', url);
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
