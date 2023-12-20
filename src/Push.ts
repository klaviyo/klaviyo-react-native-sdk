export interface IKlaviyoPushApi {
  readonly setPushToken: (token: String) => void;
  readonly getPushToken: () => String | null;
}
