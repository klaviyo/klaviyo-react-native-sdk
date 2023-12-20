import * as React from 'react';

import { StyleSheet, View, Text, Button } from 'react-native';
import { Klaviyo, EventProperty, EventType } from 'klaviyo-react-native-sdk';

export default function App() {
  const [result] = React.useState<number | undefined>();

  React.useEffect(() => {
    Klaviyo.initialize('LuYLmF');

    Klaviyo.setProfile({
      email: 'test@klaviyo.com',
    });

    Klaviyo.createEvent(EventType.OPENED_PUSH, {
      [EventProperty.EVENT_ID]: '123',
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
      <Button
        title="Click Me"
        onPress={() => {
          Klaviyo.createCustomEvent('CUSTOM_EVENT', {
            custom_property_2: '321',
            [EventProperty.VALUE]: 12,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
