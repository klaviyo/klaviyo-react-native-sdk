import { AppRegistry } from 'react-native';
import { SafeAreaRoot } from './src/safeArea';
import App from './src/App';
import { name as appName } from './app.json';

// SafeAreaRoot must wrap App (rather than live inside it) so any descendant —
// including AppHeader — can read safe-area insets. It resolves per platform;
// see src/safeArea.tsx.
function Root() {
  return (
    <SafeAreaRoot>
      <App />
    </SafeAreaRoot>
  );
}

AppRegistry.registerComponent(appName, () => Root);
