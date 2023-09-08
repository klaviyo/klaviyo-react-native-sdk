import React from 'react';
import {Button} from 'react-native';
import {NativeModules} from 'react-native';
const KlaviyoInterface = () => {
  const onPress = async () => {
    console.log("pressed ...");
  };

  return (
    <Button
      title="Click to invoke your native module!"
      color="#841584"
      onPress={onPress}
    />
  );
};

export default KlaviyoInterface;
