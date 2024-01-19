import {
  getEmail,
  getExternalId,
  getPhoneNumber,
  resetProfile,
  sendRandomEvent,
  setEmail,
  setExternalId,
  setPhoneNumber,
  setProfileAttribute,
  setProfile,
} from './KlaviyoReactWrapper';

export interface AppViewInterface {
  title: string;
  color: string;
  onPress: () => Promise<void>;
}

export const appViews: AppViewInterface[] = [
  {
    title: 'Click to set the full profile',
    color: '#841584',
    onPress: setProfile,
  },
  {
    title: 'Click to set custom profile attribute',
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
    title: 'Click to send event with random metric',
    color: '#841584',
    onPress: sendRandomEvent,
  },
];
