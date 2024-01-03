import * as React from 'react';

import { Button, View } from 'react-native';
import { styles } from './Styles';

import { appViews } from './AppViewInterface';

export default function App() {
  return (
    <View style={styles.container}>
      <>
        {appViews.map((appView) => (
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
