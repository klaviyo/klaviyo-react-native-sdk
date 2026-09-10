/**
 * API smoke test for the React Native version matrix.
 *
 * version-matrix.sh copies this over the scaffold's App.tsx at tier 4, before the
 * release build, so it is compiled into the bundle the device actually runs.
 *
 * It emits two signals, and they prove different things:
 *
 *   KLAVIYO_ROUNDTRIP_OK  isLoggingEnabled invoked its callback. This is the only
 *                         call in the public API that returns a value, so it is
 *                         the single line that proves the bridge reached native
 *                         code and came back. Read this column first.
 *
 *   KLAVIYO_SMOKE_DONE    how many of the fire-and-forget calls threw
 *                         synchronously. Weak on its own: the legacy bridge is
 *                         async, so a call that never reaches native still counts
 *                         as OK here. A previous run reported "108 calls, zero
 *                         failures" while producing no native evidence at all.
 */
import { NativeModules, SafeAreaView, ScrollView, Text } from 'react-native';
import { Klaviyo } from 'klaviyo-react-native-sdk';

// The constants the native bridge exports, sorted so the comparison is
// order-insensitive. Map iteration order is not specified, so an
// order-sensitive capture would be a bad baseline.
try {
  const c = (NativeModules as any).KlaviyoReactNativeSdk.getConstants();
  console.log(
    'KLAVIYO_CONSTANTS ' +
      JSON.stringify({
        PROFILE_KEYS: Object.entries(c.PROFILE_KEYS).sort(),
        EVENT_NAMES: Object.entries(c.EVENT_NAMES).sort(),
        FORMS_AVAILABLE: c.FORMS_AVAILABLE,
        LOCATION_AVAILABLE: c.LOCATION_AVAILABLE,
      })
  );
} catch (e: any) {
  console.log('KLAVIYO_CONSTANTS_FAIL ' + (e && e.message));
}

const results: string[] = [];

const run = (label: string, fn: () => void) => {
  try {
    fn();
    results.push('OK   ' + label);
  } catch (e: any) {
    results.push('FAIL ' + label);
    console.log('KLAVIYO_SMOKE_FAIL ' + label + ' :: ' + (e && e.message));
  }
};

// Logging first. This is a no-op in a release build -- the level is already
// Log.Level.Error and setLoggingEnabled only acts when logging was previously
// turned off -- but it keeps the sequence honest if the harness ever runs debug.
run('setLoggingEnabled', () => Klaviyo.setLoggingEnabled(true));
run('initialize', () => Klaviyo.initialize('TESTKY'));
run('setEmail', () => Klaviyo.setEmail('t@example.com'));
run('setPhoneNumber', () => Klaviyo.setPhoneNumber('+15555555555'));
run('setExternalId', () => Klaviyo.setExternalId('ext-id'));
run('setProfileAttribute', () =>
  Klaviyo.setProfileAttribute('first_name' as any, 'Test')
);
run('setProfile', () => Klaviyo.setProfile({ email: 'p@example.com' } as any));
run('createEvent', () => Klaviyo.createEvent({ name: 'OPENED_APP' } as any));
run('resetProfile', () => Klaviyo.resetProfile());

const failures = results.filter((r) => r.indexOf('FAIL') === 0).length;

// The decisive call. If the bridge is dead this callback never fires, the matrix
// records roundTrip=NO, and that is the honest result.
try {
  Klaviyo.isLoggingEnabled((enabled: boolean) => {
    console.log('KLAVIYO_ROUNDTRIP_OK value=' + String(enabled));
    results.push('OK   isLoggingEnabled -> ' + String(enabled));
  });
} catch (e: any) {
  console.log('KLAVIYO_SMOKE_FAIL isLoggingEnabled :: ' + (e && e.message));
}

// Emitted last and on a delay, so the round-trip callback has time to land before
// the harness stops reading logcat. The harness waits for this line.
setTimeout(() => {
  console.log(
    'KLAVIYO_SMOKE_DONE total=' + results.length + ' failures=' + failures
  );
}, 4000);

export default function App() {
  return (
    <SafeAreaView>
      <ScrollView>
        <Text>klaviyo api smoke</Text>
        {results.map((r, i) => (
          <Text key={i}>{r}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
