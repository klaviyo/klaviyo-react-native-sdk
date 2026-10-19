import type { ReactElement } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ConfigureResponseScreen } from '../ConfigureResponseScreen';
import { useAuth } from '../../hooks/useAuth';
import type { ProviderResponse } from '../../hooks/useAuth';
import type { RootStackParamList } from '../../navigation/types';

let mockHookIndex = 0;
let mockHookValues: unknown[] = [];
let mockEffectDependencies: unknown[] | undefined;

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (initial: unknown) => {
    const index = mockHookIndex++;
    if (!(index in mockHookValues)) {
      mockHookValues[index] = initial;
    }
    return [mockHookValues[index], jest.fn()];
  },
  useLayoutEffect: (effect: () => void, dependencies: unknown[]) => {
    if (
      !mockEffectDependencies ||
      dependencies.some(
        (value, index) => value !== mockEffectDependencies![index]
      )
    ) {
      mockEffectDependencies = dependencies;
      effect();
    }
  },
}));

jest.mock('klaviyo-react-native-sdk', () => ({ Klaviyo: {} }));
jest.mock('../../hooks/useNowMs', () => ({ useNowMs: () => 0 }));
jest.mock('../../hooks/useAuth', () => ({
  ...jest.requireActual('../../hooks/useAuth'),
  useAuth: jest.fn(),
}));

type DoneProps = { disabled: boolean; onPress: () => void };
type Props = NativeStackScreenProps<RootStackParamList, 'ConfigureResponse'>;

const response: ProviderResponse = {
  id: 'editing',
  delaySeconds: 0,
  outcome: { kind: 'customToken', token: 'original-token' },
};

describe('ConfigureResponseScreen response locking', () => {
  beforeEach(() => {
    mockHookIndex = 0;
    mockHookValues = [];
    mockEffectDependencies = undefined;
    jest.clearAllMocks();
  });

  it.each([
    ['a served middle row', false, true, true],
    ['the repeating last row', true, true, false],
    ['a row while the provider is disabled', false, false, false],
  ])(
    'handles %s becoming served while editing',
    (_label, last, enabled, locked) => {
      const responses = last
        ? [response]
        : [response, { ...response, id: 'last' }];
      let served = false;
      const updateResponse = jest.fn();
      let done: DoneProps;
      const navigation = {
        goBack: jest.fn(),
        setOptions: ({
          headerRight,
        }: {
          headerRight: () => ReactElement<DoneProps>;
        }) => {
          done = headerRight().props;
        },
      };
      const auth = {
        responses,
        getResponse: () => response,
        isServed: () => enabled && served,
        updateResponse,
      };
      jest
        .mocked(useAuth)
        .mockReturnValue(auth as unknown as ReturnType<typeof useAuth>);
      const props = {
        route: { params: { responseId: response.id } },
        navigation,
      } as unknown as Props;
      const render = () => {
        mockHookIndex = 0;
        ConfigureResponseScreen(props);
      };

      render();
      expect(done!.disabled).toBe(false);

      served = true;
      render();
      expect(done!.disabled).toBe(locked);
      done!.onPress();

      expect(updateResponse).toHaveBeenCalledTimes(locked ? 0 : 1);
      expect(navigation.goBack).toHaveBeenCalledTimes(locked ? 0 : 1);
    }
  );
});
