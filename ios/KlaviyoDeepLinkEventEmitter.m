#import "React/RCTBridgeModule.h"
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(KlaviyoDeepLinkEventEmitter, RCTEventEmitter)

RCT_EXTERN_METHOD(registerDeepLinkHandler)

@end