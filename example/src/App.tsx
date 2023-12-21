import * as React from 'react';

import { StyleSheet, View, Text, Button } from 'react-native';
import { Klaviyo, EventProperty, EventType } from 'klaviyo-react-native-sdk';

export default function App() {
  const [result] = React.useState<number | undefined>();

  React.useEffect(() => {
    Klaviyo.createEvent({
      event: EventType.CUSTOM('EXAMPLE_EVENT'),
      properties: {
        [EventProperty.EVENT_ID.name]: '123',
      },
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
      <Button
        title="Click Me"
        onPress={() => {
          Klaviyo.createEvent({
            event: EventType.CUSTOM('EXAMPLE_EVENT_2'),
            properties: {
              [EventProperty.EVENT_ID.name]: '321',
            },
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
