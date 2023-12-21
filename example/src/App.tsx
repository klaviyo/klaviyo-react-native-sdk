import * as React from 'react';

import { StyleSheet, View, Text, Button } from 'react-native';
<<<<<<< HEAD
import { Klaviyo, EventProperty, EventType } from 'klaviyo-react-native-sdk';
=======
import {
  multiply,
  Klaviyo,
  KlaviyoEventName,
  KlaviyoEventProperty
} from 'klaviyo-react-native-sdk';
>>>>>>> 2426f1f (create event interface)

export default function App() {
  const [result] = React.useState<number | undefined>();

  React.useEffect(() => {
<<<<<<< HEAD
    Klaviyo.createEvent({
      event: EventType.CUSTOM('EXAMPLE_EVENT'),
      properties: {
        [EventProperty.EVENT_ID.name]: '123',
=======
    multiply(3, 7).then(setResult);
    Klaviyo.createEvent(
      KlaviyoEventName.OPENED_PUSH,
      {
        "custom_property": '123',
        [KlaviyoEventProperty.VALUE]: 1,
>>>>>>> 2426f1f (create event interface)
      },
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
      <Button
        title="Click Me"
        onPress={() => {
          Klaviyo.createCustomEvent(
            "CUSTOM_EVENT",
            {
              "custom_property_2": '321',
              [KlaviyoEventProperty.VALUE]: 12,
            },
          );
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
