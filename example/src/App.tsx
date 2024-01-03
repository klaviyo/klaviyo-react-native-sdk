import * as React from 'react';

import { Button, View } from 'react-native';
import { type AppViewInterface, appViews } from './AppViewInterface';
import { styles } from './Styles';

export default function App() {
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
