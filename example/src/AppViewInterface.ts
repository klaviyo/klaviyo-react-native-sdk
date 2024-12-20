import {
  initialize,
  getEmail,
  getExternalId,
  getPhoneNumber,
  resetProfile,
  setPushToken,
  sendRandomEvent,
  setEmail,
  setExternalId,
  setPhoneNumber,
  setProfileAttribute,
  setProfile,
  setBadgeCount,
} from './KlaviyoReactWrapper';

import { helloWorld } from './KlaviyoUIWrapper';

export interface AppViewInterface {
  title: string;
  color: string;
  onPress: () => Promise<void>;
}

export const appViews: AppViewInterface[] = [
  {
    title: 'Click to initialize',
    color: '#841584',
    onPress: initialize,
  },
  {
    title: 'Click to set the full profile',
    color: '#841584',
    onPress: setProfile,
  },
  {
    title: 'Click to set some profile attributes',
    color: '#841584',
    onPress: setProfileAttribute,
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
    title: 'Click to set badge count',
    color: '#841584',
    onPress: setBadgeCount,
  },
  {
    title: 'Click to RESET the full profile',
    color: '#ffcccb',
    onPress: resetProfile,
  },
  {
    title: 'Click to set a FAKE push token',
    color: '#ffcccb',
    onPress: setPushToken,
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
    title: 'Click to send event with random metric',
    color: '#841584',
    onPress: sendRandomEvent,
  },
];
