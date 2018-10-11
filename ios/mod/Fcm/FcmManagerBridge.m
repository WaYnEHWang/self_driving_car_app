#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FcmManager, NSObject)

RCT_EXTERN_METHOD(scheduleToSendToken)
RCT_EXTERN_METHOD(clear)
RCT_EXTERN_METHOD(getFCMToken: (RCTPromiseResolveBlock) resolve reject: (RCTPromiseRejectBlock) reject)
RCT_EXTERN_METHOD(refreshFCMToken)

@end
