#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MqttManager, NSObject)

RCT_EXTERN_METHOD(subscribe:(NSString *)topicName qos:(NSInteger *)qos)
RCT_EXTERN_METHOD(set2v2_pro:(BOOL)v2)

@end
