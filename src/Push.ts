export interface KlaviyoPushApi {
  readonly setPushToken: (token: String) => void;
  readonly getPushToken: () => String | null;
}
