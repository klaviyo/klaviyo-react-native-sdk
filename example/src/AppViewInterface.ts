import {
  getEmail,
  getExternalId,
  getPhoneNumber,
  getPushToken,
  initialize,
  resetProfile,
  sendRandomEvent,
  setEmail,
  setExternalId,
  setPhoneNumber,
  setProfile,
} from './KlaviyoReactWrapper';

interface AppViewInterface {
  title: string;
  color: string;
  onPress: () => Promise<void>;
}

export const appViews: AppViewInterface[] = [
  {
    title: 'Click to init the SDK (ONLY FOR TESTING IN DEBUG MODE)',
    color: '#841584',
    onPress: initialize,
  },
  {
    title: 'Click to set the full profile',
    color: '#841584',
    onPress: setProfile,
  },
  {
    title: 'Click to set the email',
    color: '#841584',
    onPress: setEmail,
  },
  {
    title: 'Click to set the phone number',
    color: '#841584',
    onPress: setPhoneNumber,
  },
  {
    title: 'Click to set external id',
    color: '#841584',
    onPress: setExternalId,
  },
  {
    title: 'Click to RESET the full profile',
    color: '#ffcccb',
    onPress: resetProfile,
  },
  {
    title: 'Click to get current email',
    color: '#841584',
    onPress: getEmail,
  },
  {
    title: 'Click to get phone number',
    color: '#841584',
    onPress: getPhoneNumber,
  },
  {
    title: 'Click to get external id',
    color: '#841584',
    onPress: getExternalId,
  },
  {
    title: 'Click to get push token',
    color: '#841584',
    onPress: getPushToken,
  },
  {
    title: 'Click to send random event',
    color: '#841584',
    onPress: sendRandomEvent,
  },
];
