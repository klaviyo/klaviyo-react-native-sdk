import * as React from 'react';

import { StyleSheet, View, Text } from 'react-native';
import {multiply, Klaviyo, EventKey, EventPropertyKey} from 'klaviyo-react-native-sdk';

export default function App() {
  const [result, setResult] = React.useState<number | undefined>();

  React.useEffect(() => {
    multiply(3, 7).then(setResult);
    Klaviyo.createEvent({
      event: EventKey.OPENED_PUSH,
      properties: {
        [EventPropertyKey.EVENT_ID]: "Hello",
        ["custom_event"]: 2,
      }
    })
  }, []);

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
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
