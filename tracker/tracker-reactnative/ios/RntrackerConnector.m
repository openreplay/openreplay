#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(ORTrackerConnector, NSObject)
RCT_EXTERN_METHOD(start:(NSString *)projectKey optionsDict:(NSDictionary *)optionsDict projectUrl:(NSString *)projectUrl)
RCT_EXTERN_METHOD(startSession:(NSString *)projectKey optionsDict:(NSDictionary *)optionsDict projectUrl:(NSString *)projectUrl)
RCT_EXTERN_METHOD(stop)
RCT_EXTERN_METHOD(setMetadata:(NSString *)key value:(NSString *)value)
RCT_EXTERN_METHOD(event:(NSString *)name object:(NSString *)object)
RCT_EXTERN_METHOD(setUserID:(NSString *)userID)
RCT_EXTERN_METHOD(userAnonymousID:(NSString *)userID)
@end

