export interface KlaviyoPushApi {
  readonly setPushToken: (token: String) => void;
  readonly getPushToken: (callback: Function | undefined) => String | null;
}
